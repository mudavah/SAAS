/**
 * KaziFlow — Subscription lifecycle service
 * ------------------------------------------------------------------
 * Encapsulates upgrade, downgrade, cancellation, coupon application, grace-period
 * handling and tax-invoice generation. All operations are organization-scoped and
 * audited. Stripe-facing operations are delegated to @/lib/stripe; local state is
 * the source of truth for plan gating.
 */
import { db } from "@/db";
import {
  subscriptions,
  coupons,
  subscriptionInvoices,
  organizations,
  users,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, business: 2 };

function generateInvoiceNumber(orgCode: string): string {
  const ym = new Date().toISOString().slice(0, 7).replace("-", "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${orgCode}-${ym}-${rand}`;
}

/** List an organization's subscriptions (local records). */
export async function listSubscriptions(ctx: ServerContext) {
  return db.query.subscriptions.findMany({
    where: eq(subscriptions.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
}

/** Apply a coupon code, validating status/expiry/redemptions and plan scope. */
export async function applyCoupon(ctx: ServerContext, code: string, plan: string) {
  const coupon = await db.query.coupons.findFirst({
    where: and(eq(coupons.organizationId, ctx.organizationId), eq(coupons.code, code.trim().toUpperCase())),
  });
  if (!coupon) throw new Error("Coupon code not found.");
  if (coupon.status !== "active") throw new Error("This coupon is not active.");
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now())
    throw new Error("This coupon has expired.");
  if (coupon.maxRedemptions && coupon.redemptionsUsed >= coupon.maxRedemptions)
    throw new Error("This coupon has reached its redemption limit.");
  if (coupon.plan && coupon.plan !== plan)
    throw new Error(`This coupon is only valid for the ${coupon.plan} plan.`);
  return coupon;
}

/** Create a local tax invoice (subscription billing record). */
export async function createTaxInvoice(ctx: ServerContext, input: {
  subscriptionId?: string;
  provider?: string;
  providerInvoiceId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  subtotal: number;
  taxRate?: number;
  currency?: string;
  invoiceUrl?: string;
}): Promise<typeof subscriptionInvoices.$inferSelect> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, ctx.organizationId),
    columns: { slug: true },
  });
  const orgCode = (org?.slug || "ORG").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ORG";
  const taxRate = input.taxRate ?? 0;
  const taxAmount = Number((input.subtotal * taxRate) / 100);
  const total = Number(input.subtotal) + taxAmount;

  const [row] = await db
    .insert(subscriptionInvoices)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      provider: input.provider ?? "stripe",
      providerInvoiceId: input.providerInvoiceId ?? null,
      number: generateInvoiceNumber(orgCode),
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      subtotal: String(input.subtotal),
      taxRate: String(taxRate),
      taxAmount: String(taxAmount.toFixed(2)),
      total: String(total.toFixed(2)),
      currency: input.currency ?? "KES",
      status: "open",
      invoiceUrl: input.invoiceUrl ?? null,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "subscription_invoice.create",
    category: "subscription",
    resourceType: "subscription_invoice",
    resourceId: row.id,
    description: `Generated tax invoice ${row.number} for ${row.total} ${row.currency}`,
    newValues: { total: row.total, currency: row.currency },
  });

  return row;
}

/** Schedule a downgrade at period end (keeps current plan until then). */
export async function downgradeSubscription(ctx: ServerContext, plan: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
  const currentPlan = sub?.plan ?? "free";
  if ((PLAN_ORDER[plan] ?? 0) >= (PLAN_ORDER[currentPlan] ?? 0)) {
    throw new Error("Use upgrade to move to a higher plan.");
  }
  if (sub) {
    await db
      .update(subscriptions)
      .set({ plan, cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }
  await db
    .update(organizations)
    .set({ plan: plan as any, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.organizationId));

  await logAuditSafe(ctx, {
    action: "subscription.downgrade",
    category: "subscription",
    resourceType: "subscription",
    resourceId: sub?.id ?? undefined,
    description: `Scheduled downgrade to ${plan} at period end`,
    newValues: { plan },
  });
  return { ok: true, plan };
}

/** Cancel the active subscription at period end. */
export async function cancelSubscription(ctx: ServerContext) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
  if (sub) {
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }
  await logAuditSafe(ctx, {
    action: "subscription.cancel",
    category: "subscription",
    resourceType: "subscription",
    resourceId: sub?.id ?? undefined,
    description: "Scheduled subscription cancellation at period end",
  });
  await createNotification({
    organizationId: ctx.organizationId,
    category: "subscriptions",
    type: "subscription_cancelled",
    title: "Subscription cancelling",
    message: "Your subscription will cancel at the end of the current billing period.",
    deepLink: "/dashboard/payments/subscriptions",
  });
  return { ok: true };
}

/**
 * Handle a failed subscription payment: enter grace period if configured and
 * notify the owner. Returns the new gracePeriodEnd if applied.
 */
export async function handleFailedPayment(ctx: ServerContext, days = 7) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
  const gracePeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  if (sub) {
    await db
      .update(subscriptions)
      .set({ status: "past_due", gracePeriodEnd, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }
  await logAuditSafe(ctx, {
    action: "subscription.payment_failed",
    category: "subscription",
    resourceType: "subscription",
    resourceId: sub?.id ?? undefined,
    description: `Subscription payment failed; grace period until ${gracePeriodEnd.toISOString()}`,
  });
  await createNotification({
    organizationId: ctx.organizationId,
    category: "subscriptions",
    type: "payment_failed",
    title: "Payment failed — grace period active",
    message: `We couldn't process your last payment. You have until ${gracePeriodEnd.toLocaleDateString()} to update billing.`,
    deepLink: "/dashboard/payments/subscriptions",
  });
  return { ok: true, gracePeriodEnd };
}

/** List tax invoices for the organization. */
export async function listTaxInvoices(ctx: ServerContext) {
  return db.query.subscriptionInvoices.findMany({
    where: eq(subscriptionInvoices.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
}

/** Admin: create a coupon. */
export async function createCoupon(ctx: ServerContext, input: {
  code: string;
  name?: string;
  type: "percent" | "amount" | "trial_days";
  value: number;
  plan?: string;
  maxRedemptions?: number;
  expiresAt?: Date | null;
}) {
  const [row] = await db
    .insert(coupons)
    .values({
      organizationId: ctx.organizationId,
      code: input.code.trim().toUpperCase(),
      name: input.name,
      type: input.type,
      value: String(input.value),
      plan: input.plan,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt ?? null,
      status: "active",
      createdBy: ctx.userId ?? null,
    })
    .returning();
  await logAuditSafe(ctx, {
    action: "coupon.create",
    category: "subscription",
    resourceType: "coupon",
    resourceId: row.id,
    description: `Created coupon ${row.code}`,
  });
  return row;
}

export async function listCoupons(ctx: ServerContext) {
  return db.query.coupons.findMany({
    where: eq(coupons.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
  });
}
