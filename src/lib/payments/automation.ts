import { db } from "@/db";
import { invoices, journalEntries, journalEntryLines, chartOfAccounts, inventoryProducts, inventoryStock, inventoryStockMovements, notifications, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toCents, fromCents } from "@/lib/money";
import type { PaymentAutomationContext } from "./types";

export async function runPaymentAutomations(context: PaymentAutomationContext): Promise<void> {
  const tasks = [
    markInvoicePaid(context),
    createJournalEntry(context),
    updateInventory(context),
    notifyAIEngine(context),
  ];

  await Promise.allSettled(tasks);
}

async function markInvoicePaid(context: PaymentAutomationContext): Promise<void> {
  if (!context.invoiceId) return;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, context.invoiceId), eq(invoices.organizationId, context.organizationId)),
  });

  if (!invoice) return;

  const totalCents = toCents(invoice.total);
  const newPaidCents = Math.min(toCents(invoice.amountPaid) + toCents(context.amount), totalCents);

  await db
    .update(invoices)
    .set({
      amountPaid: fromCents(newPaidCents),
      status: newPaidCents >= totalCents ? "paid" : "partial",
      paidAt: newPaidCents >= totalCents ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, context.invoiceId));
}

async function createJournalEntry(context: PaymentAutomationContext): Promise<void> {
  const incomeAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.organizationId, context.organizationId),
      eq(chartOfAccounts.type, "income")
    ),
    limit: 1,
  });

  const receivableAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.organizationId, context.organizationId),
      eq(chartOfAccounts.type, "asset")
    ),
    limit: 1,
  });

  const incomeAccountId = incomeAccounts[0]?.id;
  const receivableAccountId = receivableAccounts[0]?.id;

  if (!incomeAccountId || !receivableAccountId) return;

  const [journalEntry] = await db
    .insert(journalEntries)
    .values({
      organizationId: context.organizationId,
      userId: context.userId,
      date: new Date(),
      description: `Payment received via ${context.method} - ${context.reference || context.paymentId}`,
      status: "posted",
    })
    .returning();

  await db.insert(journalEntryLines).values([
    {
      organizationId: context.organizationId,
      journalEntryId: journalEntry.id,
      accountId: receivableAccountId,
      debit: context.amount.toFixed(2),
      credit: "0",
      description: `Payment from ${context.method}`,
    },
    {
      organizationId: context.organizationId,
      journalEntryId: journalEntry.id,
      accountId: incomeAccountId,
      debit: "0",
      credit: context.amount.toFixed(2),
      description: `Payment via ${context.method}`,
    },
  ]);
}

async function updateInventory(context: PaymentAutomationContext): Promise<void> {
  if (!context.invoiceId) return;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, context.invoiceId), eq(invoices.organizationId, context.organizationId)),
    with: { items: true },
  });

  if (!invoice?.items) return;

  for (const item of invoice.items) {
    const products = await db.query.inventoryProducts.findMany({
      where: and(
        eq(inventoryProducts.organizationId, context.organizationId),
        eq(inventoryProducts.name, item.description)
      ),
      with: { stock: true },
    });

    const product = products[0];
    if (!product || !product.stock || product.stock.length === 0) continue;

    const stock = product.stock[0];
    const quantityToDeduct = Number(item.quantity) || 0;

    const stockQuantity = Number(stock.quantity) || 0;
    const newQuantity = Math.max(0, stockQuantity - quantityToDeduct);
    await db
      .update(inventoryStock)
      .set({ quantity: newQuantity.toFixed(2) })
      .where(eq(inventoryStock.id, stock.id));

    await db.insert(inventoryStockMovements).values({
      organizationId: context.organizationId,
      userId: context.userId,
      productId: product.id,
      warehouseId: stock.warehouseId,
      type: "sale",
      quantity: quantityToDeduct.toFixed(2),
      referenceId: context.paymentId,
      referenceType: "payment",
      notes: `Sold via payment ${context.paymentId}`,
    });
  }
}

async function notifyAIEngine(context: PaymentAutomationContext): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "revenue_forecast",
        context: `Payment of ${context.amount} ${context.currency} received via ${context.method}`,
        tone: "professional",
      }),
    });
  } catch {
    // AI notification is best-effort
  }
}

export async function approveBankTransfer(paymentId: string, userId: string, organizationId: string): Promise<void> {
  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.organizationId, organizationId)),
  });

  if (!payment || payment.method !== "bank_transfer") return;

  await db.update(payments).set({ status: "completed", paidAt: new Date() }).where(eq(payments.id, paymentId));

  await markInvoicePaid({
    paymentId,
    organizationId,
    userId,
    invoiceId: payment.invoiceId || undefined,
    clientId: payment.clientId || undefined,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    method: payment.method,
    status: "completed",
  });

  await createAuditLog({
    action: "payment.approve",
    category: "payments",
    organizationId,
    userId,
    resourceType: "payment",
    resourceId: paymentId,
    description: "Bank transfer payment approved",
    newValues: { status: "completed" },
  });

  await createNotification({
    organizationId,
    category: "payments",
    type: "bank_transfer_approved",
    title: "Bank transfer approved",
    message: `Bank transfer payment of ${payment.amount} has been approved.`,
    priority: "high",
    deepLink: "/dashboard/payments",
  });
}
