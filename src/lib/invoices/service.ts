import { db } from "@/db";
import { invoices, invoiceItems, clients, usageRecords } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { and, eq } from "drizzle-orm";
import { generateInvoiceNumber, getCurrentMonth, PLAN_LIMITS } from "@/lib/utils";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { dispatchBusinessEvent } from "@/lib/automation/engine";
import { logger } from "@/lib/logger";
import type { ServerContext } from "@/lib/session";
import type { PlanType } from "@/lib/utils";

export interface CreateInvoiceInput {
  clientId?: string | null;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  taxRate: number;
  notes?: string | null;
  terms?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  send?: boolean;
}

export interface CreateInvoiceResult {
  invoice: typeof invoices.$inferSelect;
}

export async function createInvoice(
  ctx: ServerContext,
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  const plan = (ctx.organization.plan || "free") as PlanType;
  const limits = PLAN_LIMITS[plan];

  if (limits.invoicesPerMonth !== Infinity) {
    const month = getCurrentMonth();
    const usage = await db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.organizationId, ctx.organizationId),
        eq(usageRecords.month, month)
      ),
    });

    if (usage && usage.invoicesCreated >= limits.invoicesPerMonth) {
      throw new Error(`Plan invoice limit reached (${limits.invoicesPerMonth} invoices/month). Upgrade to Pro.`);
    }
  }

  if (input.clientId) {
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, input.clientId),
        eq(clients.organizationId, ctx.organizationId)
      ),
      columns: { id: true },
    });
    if (!client) {
      throw new Error("Client not found");
    }
  }

  const subtotal = input.items.reduce(
    (s, i) => s + i.quantity * i.unitPrice,
    0
  );
  const taxAmount = subtotal * (input.taxRate / 100);
  const total = subtotal + taxAmount;

  const [invoice] = await db
    .insert(invoices)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      clientId: input.clientId || null,
      invoiceNumber: generateInvoiceNumber(),
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      subtotal: subtotal.toFixed(2),
      taxRate: input.taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      notes: input.notes,
      terms: input.terms,
      status: input.send ? "sent" : "draft",
      sentAt: input.send ? new Date() : null,
    })
    .returning();

  await db.insert(invoiceItems).values(
    input.items.map((item, index) => ({
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      amount: (item.quantity * item.unitPrice).toFixed(2),
      sortOrder: index,
    }))
  );

  if (limits.invoicesPerMonth !== Infinity) {
    const month = getCurrentMonth();
    const existingUsage = await db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.organizationId, ctx.organizationId),
        eq(usageRecords.month, month)
      ),
    });

    if (existingUsage) {
      await db
        .update(usageRecords)
        .set({ invoicesCreated: existingUsage.invoicesCreated + 1 })
        .where(eq(usageRecords.id, existingUsage.id));
    } else {
      await db.insert(usageRecords).values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        month,
        invoicesCreated: 1,
      });
    }
  }

  await logAuditSafe(ctx, {
    action: "invoice.create",
    category: "invoices",
    resourceType: "invoice",
    resourceId: invoice.id,
    description: `Created invoice ${invoice.invoiceNumber}`,
    newValues: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
  });

  await createNotification({
    organizationId: ctx.organizationId,
    category: "invoices",
    type: "invoice_created",
    title: "Invoice created",
    message: `Invoice ${invoice.invoiceNumber} was created${input.send ? " and sent" : ""}.`,
    priority: "normal",
    deepLink: `/dashboard/invoices/${invoice.id}`,
  });

  try {
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "invoice.created",
      title: `Invoice ${invoice.invoiceNumber} created`,
      description: `Total ${invoice.currency} ${invoice.total}${input.send ? " · sent to client" : ""}`,
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total, status: invoice.status },
    });
  } catch (e) {
    logger.error("Timeline emit failed (invoice.created):", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
  }

  void dispatchBusinessEvent({
    type: "invoice.created",
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    payload: { invoice: { id: invoice.id, status: invoice.status, total: invoice.total }, id: invoice.id },
  });

  return { invoice };
}
