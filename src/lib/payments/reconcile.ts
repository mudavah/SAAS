import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface ReconciliationRecord {
  id: string;
  paymentId: string;
  organizationId: string;
  status: "matched" | "unmatched" | "disputed";
  amount: number;
  currency: string;
  reference?: string;
  receiptNumber?: string;
  matchedAt: Date;
  notes?: string;
}

export async function getOutstandingPayments(organizationId: string) {
  const result = await db.query.payments.findMany({
    where: and(eq(payments.organizationId, organizationId), eq(payments.status, "pending")),
    orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    with: { invoice: true, client: true },
  });

  return result;
}

export async function getUnreconciledPayments(organizationId: string) {
  const allPayments = await db.query.payments.findMany({
    where: and(eq(payments.organizationId, organizationId), eq(payments.status, "completed")),
    orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    with: { invoice: true },
  }) as any[];

  return allPayments.filter((p) => {
    if (!p.invoiceId) return true;
    const invoice = p.invoice;
    if (!invoice) return true;
    return parseFloat(invoice.amountPaid || "0") < parseFloat(invoice.total);
  });
}

export async function getPaymentAnalytics(organizationId: string, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allPayments = await db.query.payments.findMany({
    where: and(
      eq(payments.organizationId, organizationId),
      sql`${payments.createdAt} >= ${cutoffDate.toISOString()}`
    ),
  });

  const completed = allPayments.filter((p) => p.status === "completed");
  const failed = allPayments.filter((p) => p.status === "failed");
  const pending = allPayments.filter((p) => p.status === "pending");

  const totalRevenue = completed.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const failedAmount = failed.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const byMethod = completed.reduce<Record<string, { count: number; amount: number }>>((acc, p) => {
    if (!acc[p.method]) acc[p.method] = { count: 0, amount: 0 };
    acc[p.method].count += 1;
    acc[p.method].amount += parseFloat(p.amount);
    return acc;
  }, {});

  const daily = completed.reduce<Record<string, number>>((acc, p) => {
    const day = new Date(p.createdAt).toISOString().slice(0, 10);
    acc[day] = (acc[day] || 0) + parseFloat(p.amount);
    return acc;
  }, {});

  return {
    totalRevenue,
    failedAmount,
    transactionCount: allPayments.length,
    completedCount: completed.length,
    failedCount: failed.length,
    pendingCount: pending.length,
    byMethod,
    daily,
  };
}
