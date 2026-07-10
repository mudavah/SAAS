import { db } from "@/db";
import { payments, invoices, organizations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { type PaymentProvider, type PaymentProviderType, type CreatePaymentInput, type CreatePaymentResult, type VerifyPaymentInput, type VerifyPaymentResult, type RefundInput, type RefundResult, type CheckStatusInput, type CheckStatusResult, type CancelPendingInput, type CancelPendingResult, type ProviderConfig, type PaymentWebhookEvent, type PaymentAutomationContext, PaymentEngineError } from "./types";
import { MpesaProvider } from "./providers/mpesa";
import { StripeProvider } from "./providers/stripe";
import { PesapalProvider } from "./providers/pesapal";
import { BankTransferProvider } from "./providers/bank-transfer";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { runPaymentAutomations } from "./automation";

export { PaymentEngineError };

const providers: Record<PaymentProviderType, PaymentProvider> = {
  mpesa: new MpesaProvider(),
  stripe: new StripeProvider(),
  pesapal: new PesapalProvider(),
  bank_transfer: new BankTransferProvider(),
};

export function getProvider(type: PaymentProviderType): PaymentProvider {
  const provider = providers[type];
  if (!provider) {
    throw new PaymentEngineError(
      "UNKNOWN_PROVIDER",
      `Payment provider "${type}" is not supported.`
    );
  }
  if (!provider.isConfigured()) {
    throw new PaymentEngineError(
      "PROVIDER_NOT_CONFIGURED",
      `${provider.name} is not configured. Please check your payment settings.`
    );
  }
  return provider;
}

export function getAvailableProviders(): { type: PaymentProviderType; name: string; supportedOperations: string[] }[] {
  return Object.values(providers)
    .filter((p) => p.isConfigured())
    .map((p) => ({
      type: p.type,
      name: p.name,
      supportedOperations: p.supportedOperations,
    }));
}

export function getDefaultProvider(): PaymentProviderType {
  return "mpesa";
}

export async function loadProviderConfig(organizationId: string, type: PaymentProviderType): Promise<ProviderConfig | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { settings: true },
  });

  if (!org?.settings) return null;

  const paymentSettings = (org.settings as Record<string, unknown>).paymentProviders as Record<string, ProviderConfig> | undefined;
  return paymentSettings?.[type] ?? null;
}

export async function saveProviderConfig(organizationId: string, type: PaymentProviderType, config: Partial<ProviderConfig>): Promise<void> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    throw new PaymentEngineError("ORG_NOT_FOUND", "Organization not found.");
  }

  const settings = (org.settings || {}) as Record<string, unknown>;
  const paymentProviders = (settings.paymentProviders || {}) as Record<string, ProviderConfig>;

  const existing = paymentProviders[type] || { enabled: false, environment: "sandbox" as const };
  const updated = { ...existing, ...config };

  if (config.enabled !== undefined && config.enabled) {
    updated.isDefault = config.isDefault ?? false;
  }

  if (updated.isDefault && config.enabled) {
    for (const key of Object.keys(paymentProviders)) {
      if (key !== type) {
        paymentProviders[key] = { ...paymentProviders[key], isDefault: false };
      }
    }
  }

  paymentProviders[type] = updated;
  settings.paymentProviders = paymentProviders;

  await db.update(organizations).set({ settings, updatedAt: new Date() }).where(eq(organizations.id, organizationId));

  providers[type].updateConfig(updated);
}

export async function createPayment(input: CreatePaymentInput, context: { userId: string; organizationId: string }): Promise<{ payment: typeof payments.$inferInsert; result: CreatePaymentResult }> {
  const provider = getProvider(input.provider);

  const engineInput: CreatePaymentInput = {
    ...input,
    callbackUrl: input.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhooks/${input.provider}`,
  };

  const result = await provider.createPayment(engineInput);

  if (!result.success || !result.providerPaymentId) {
    throw new PaymentEngineError(
      result.errorCode || "PAYMENT_CREATION_FAILED",
      result.error || "Failed to create payment.",
      JSON.stringify(result.rawResponse)
    );
  }

  const [payment] = await db
    .insert(payments)
    .values({
      organizationId: context.organizationId,
      userId: context.userId,
      invoiceId: input.invoiceId || null,
      clientId: input.clientId || null,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      method: input.provider,
      status: result.checkoutUrl ? "pending" : "completed",
      reference: result.reference || result.providerPaymentId,
      paidAt: result.success && !result.checkoutUrl ? new Date() : null,
      notes: input.description || null,
    })
    .returning();

  await createAuditLog({
    action: "payment.create",
    category: "payments",
    organizationId: context.organizationId,
    userId: context.userId,
    resourceType: "payment",
    resourceId: payment.id,
    description: `Initiated ${input.provider} payment of ${input.amount}`,
    newValues: { amount: input.amount, provider: input.provider, status: payment.status },
  });

  return { payment, result };
}

export async function verifyPayment(input: VerifyPaymentInput, context: { userId: string; organizationId: string }): Promise<{ payment: typeof payments.$inferSelect; result: VerifyPaymentResult }> {
  const provider = getProvider(input.provider);
  const result = await provider.verifyPayment(input);

  if (!result.success) {
    throw new PaymentEngineError(
      "VERIFICATION_FAILED",
      result.error || "Payment verification failed.",
      JSON.stringify(result.rawResponse)
    );
  }

  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.organizationId, context.organizationId),
      eq(payments.reference, input.reference || input.checkoutRequestId || input.providerPaymentId || "")
    ),
  });

  if (!payment) {
    throw new PaymentEngineError("PAYMENT_NOT_FOUND", "Payment record not found.");
  }

  const wasPending = payment.status === "pending";
  const isNowCompleted = result.status === "completed";

  if (wasPending && isNowCompleted) {
    const [updated] = await db
      .update(payments)
      .set({
        status: "completed",
        paidAt: new Date(),
        mpesaReceipt: result.receiptNumber || payment.mpesaReceipt,
        stripePaymentId: input.providerPaymentId || payment.stripePaymentId,
      })
      .where(eq(payments.id, payment.id))
      .returning();

    if (payment.invoiceId && result.amount) {
      await settleInvoice(payment.invoiceId, context.organizationId, result.amount);
    }

    await createAuditLog({
      action: "payment.update",
      category: "payments",
      organizationId: context.organizationId,
      userId: context.userId,
      resourceType: "payment",
      resourceId: payment.id,
      description: `${input.provider} payment verified and completed`,
      newValues: { status: "completed", receipt: result.receiptNumber },
    });

    await createNotification({
      organizationId: context.organizationId,
      category: "payments",
      type: `${input.provider}_success`,
      title: "Payment received",
      message: `${input.provider} payment of ${result.amount?.toFixed(2)} ${result.currency} confirmed.`,
      priority: "high",
      deepLink: `/dashboard/invoices/${payment.invoiceId || ""}`,
    });

    const automationContext: PaymentAutomationContext = {
      paymentId: updated.id,
      organizationId: context.organizationId,
      userId: context.userId,
      invoiceId: payment.invoiceId || undefined,
      clientId: payment.clientId || undefined,
      amount: result.amount || parseFloat(payment.amount),
      currency: result.currency || payment.currency,
      method: payment.method,
      status: "completed",
      reference: payment.reference || undefined,
      receiptNumber: result.receiptNumber || undefined,
    };

    await runPaymentAutomations(automationContext);
  }

  return { payment, result };
}

export async function checkPaymentStatus(input: CheckStatusInput, organizationId: string): Promise<{ payment: typeof payments.$inferSelect; result: CheckStatusResult }> {
  const provider = getProvider(input.provider);
  const result = await provider.checkStatus(input);

  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.organizationId, organizationId),
      eq(payments.reference, input.reference || input.providerPaymentId || "")
    ),
  });

  if (payment && result.status !== payment.status && result.status !== "pending") {
    await db.update(payments).set({ status: result.status }).where(eq(payments.id, payment.id));
  }

  return { payment: payment || ({} as typeof payments.$inferSelect), result };
}

export async function refundPayment(input: RefundInput, context: { userId: string; organizationId: string }): Promise<{ payment: typeof payments.$inferSelect; result: RefundResult }> {
  const provider = getProvider(input.provider);
  const result = await provider.refund(input);

  if (!result.success) {
    throw new PaymentEngineError(
      result.errorCode || "REFUND_FAILED",
      result.error || "Refund failed.",
      JSON.stringify(result.rawResponse)
    );
  }

  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.organizationId, context.organizationId),
      eq(payments.reference, input.providerPaymentId)
    ),
  });

  if (!payment) {
    throw new PaymentEngineError("PAYMENT_NOT_FOUND", "Payment record not found.");
  }

  const [updated] = await db
    .update(payments)
    .set({ status: "refunded" })
    .where(eq(payments.id, payment.id))
    .returning();

  await createAuditLog({
    action: "payment.refund",
    category: "payments",
    organizationId: context.organizationId,
    userId: context.userId,
    resourceType: "payment",
    resourceId: payment.id,
    description: `Refunded ${input.provider} payment`,
    newValues: { status: "refunded", amount: input.amount },
  });

  return { payment: updated, result };
}

export async function cancelPendingPayment(input: CancelPendingInput, organizationId: string): Promise<{ result: CancelPendingResult }> {
  const provider = getProvider(input.provider);
  const result = await provider.cancelPending(input);

  if (!result.success) {
    throw new PaymentEngineError(
      result.errorCode || "CANCEL_FAILED",
      result.error || "Failed to cancel pending payment.",
      JSON.stringify(result.rawResponse)
    );
  }

  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.organizationId, organizationId),
      eq(payments.reference, input.reference || input.providerPaymentId || "")
    ),
  });

  if (payment) {
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, payment.id));
  }

  return { result };
}

export async function getPaymentHistory(organizationId: string, limit = 50) {
  return db.query.payments.findMany({
    where: eq(payments.organizationId, organizationId),
    orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    limit,
    with: { invoice: true, client: true },
  });
}

export async function getPaymentStats(organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [stats] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount::numeric ELSE 0 END), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN status = 'pending' THEN amount::numeric ELSE 0 END), 0)`,
      failedAmount: sql<number>`COALESCE(SUM(CASE WHEN status = 'failed' THEN amount::numeric ELSE 0 END), 0)`,
      todayCount: sql<number>`COUNT(CASE WHEN created_at >= ${today} THEN 1 END)`,
      completedCount: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
      pendingCount: sql<number>`COUNT(CASE WHEN status = 'pending' THEN 1 END)`,
      failedCount: sql<number>`COUNT(CASE WHEN status = 'failed' THEN 1 END)`,
    })
    .from(payments)
    .where(eq(payments.organizationId, organizationId));

  const byMethod = await db
    .select({
      method: payments.method,
      count: sql<number>`COUNT(*)`,
      amount: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
    })
    .from(payments)
    .where(and(eq(payments.organizationId, organizationId), eq(payments.status, "completed")))
    .groupBy(payments.method);

  const byMethodMap = byMethod.reduce<Record<string, { count: number; amount: number }>>((acc, row) => {
    acc[row.method] = { count: Number(row.count), amount: Number(row.amount) };
    return acc;
  }, {});

  return {
    totalRevenue: Number(stats.totalRevenue),
    pendingAmount: Number(stats.pendingAmount),
    failedAmount: Number(stats.failedAmount),
    todayCount: Number(stats.todayCount),
    completedCount: Number(stats.completedCount),
    pendingCount: Number(stats.pendingCount),
    failedCount: Number(stats.failedCount),
    byMethod: byMethodMap,
  };
}

export async function processWebhook(provider: PaymentProviderType, rawPayload: unknown): Promise<PaymentWebhookEvent> {
  const providerInstance = providers[provider];
  const parsed = providerInstance.parseWebhookPayload(rawPayload);

  const webhookEvent: PaymentWebhookEvent = {
    id: crypto.randomUUID(),
    provider,
    type: parsed.type as PaymentWebhookEvent["type"],
    status: parsed.status,
    amount: parsed.amount,
    currency: parsed.currency,
    metadata: parsed.metadata,
    rawPayload: rawPayload as Record<string, unknown>,
    receivedAt: new Date(),
    processed: false,
    error: parsed.error,
  };

  return webhookEvent;
}

async function settleInvoice(invoiceId: string, organizationId: string, amount: number) {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)),
  });

  if (!invoice) return;

  let newPaid = parseFloat(invoice.amountPaid || "0") + amount;
  const total = parseFloat(invoice.total);

  if (newPaid > total) {
    newPaid = total;
  }

  const newStatus = newPaid >= total ? "paid" : "partial";

  await db
    .update(invoices)
    .set({
      amountPaid: newPaid.toFixed(2),
      status: newStatus,
      paidAt: newStatus === "paid" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}
