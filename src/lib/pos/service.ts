/**
 * KaziFlow — Point of Sale service (Epic 4)
 * ------------------------------------------------------------------
 * Central business logic for the POS module. Every operation is
 * multi-tenant (scoped by organizationId), RBAC-gated by the calling route,
 * audited, and emits a Business Timeline event. Integrations:
 *   • Sales            → inventory stock decrements + stock movements
 *   • Payments         → payment records + invoice reconciliation
 *   • Bookkeeping      → automatic journal entries
 *   • eTIMS            → automatic invoice submission
 *   • AI               → sales insights and recommendations
 */
import { db } from "@/db";
import {
  posSessions,
  posOrders,
  posOrderItems,
  posOrderPayments,
  posReturns,
  posReturnItems,
  inventoryProducts,
  inventoryWarehouses,
  invoices,
  invoiceItems,
  clients,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  etimsConfig,
  etimsComplianceLogs,
  organizations,
  users,
  type PosOrder,
  type PosOrderItem,
  type PosOrderPayment,
  type PosReturn,
  type PosReturnItem,
  type PosSessionStatus,
  type PosOrderStatus,
} from "@/db/schema";
import { and, desc, eq, gte, sql, sum, count, inArray } from "drizzle-orm";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { applyStockDelta } from "@/lib/procurement/stock";
import { postProcurementJournalEntry, ensureAccount } from "@/lib/procurement/accounts";
import type { ServerContext } from "@/lib/session";
import {
  posOrderSchema,
  posPaymentSchema,
  posReturnSchema,
  posSessionSchema,
  posSessionCloseSchema,
} from "@/lib/validations";
import { submitInvoiceToEtims, EtimsError, type EtimsConfigLike } from "@/lib/mpesa";
import { decryptConfigSecrets } from "@/lib/crypto";

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ── Number generation ─────────────────────────────────────────────────────────

async function nextOrderNumber(organizationId: string): Promise<string> {
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(posOrders)
    .where(eq(posOrders.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `POS-${datePart}-${String(n).padStart(4, "0")}`;
}

async function nextReturnNumber(organizationId: string): Promise<string> {
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(posReturns)
    .where(eq(posReturns.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `RET-${datePart}-${String(n).padStart(4, "0")}`;
}

// ── Money helpers ──────────────────────────────────────────────────────────────

export interface LineTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function computeLineTotals(
  items: { quantity: number; unitPrice: number; discount?: number; taxRate?: number }[],
  defaultTaxRate = 16
): LineTotals {
  let subtotal = 0;
  let taxAmount = 0;
  for (const it of items) {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    const disc = Number(it.discount ?? 0);
    const lineBase = qty * (price - disc);
    const rate = Number(it.taxRate ?? defaultTaxRate) / 100;
    subtotal += lineBase;
    taxAmount += lineBase * rate;
  }
  return {
    subtotal: round2(subtotal),
    taxAmount: round2(taxAmount),
    total: round2(subtotal + taxAmount),
  };
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function openSession(ctx: ServerContext, body: unknown) {
  const parsed = posSessionSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, status: 400 };
  }

  const [session] = await db
    .insert(posSessions)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      terminalName: "Default Terminal",
      status: "open",
      openingFloat: parsed.data.openingFloat.toString(),
      notes: parsed.data.notes ?? null,
      openedAt: new Date(),
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "pos.shift.open",
    category: "pos",
    resourceType: "pos_session",
    resourceId: session.id,
    description: `Opened POS session ${session.id.slice(0, 8)}`,
    newValues: { openingFloat: session.openingFloat },
  });

  try {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "pos.shift.opened",
      title: `POS shift opened`,
      description: `Opening float: ${session.openingFloat}`,
      resourceType: "pos_session",
      resourceId: session.id,
      metadata: { openingFloat: session.openingFloat },
    });
  } catch (e) {
    console.error("Timeline emit failed (pos.shift.opened):", e);
  }

  return { session, status: 201 };
}

export async function closeSession(ctx: ServerContext, sessionId: string, body: unknown) {
  const parsed = posSessionCloseSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, status: 400 };
  }

  const session = await db.query.posSessions.findFirst({
    where: and(
      eq(posSessions.id, sessionId),
      eq(posSessions.organizationId, ctx.organizationId),
      eq(posSessions.userId, ctx.userId!)
    ),
  });

  if (!session) {
    return { error: "Session not found", status: 404 };
  }
  if (session.status !== "open") {
    return { error: "Only open sessions can be closed", status: 400 };
  }

  const [updated] = await db
    .update(posSessions)
    .set({
      status: "closed",
      closingFloat: parsed.data.closingFloat.toString(),
      cashDeposited: parsed.data.cashDeposited.toString(),
      notes: parsed.data.notes ?? session.notes,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posSessions.id, sessionId))
    .returning();

  await logAuditSafe(ctx, {
    action: "pos.shift.close",
    category: "pos",
    resourceType: "pos_session",
    resourceId: session.id,
    description: `Closed POS session ${session.id.slice(0, 8)}`,
    newValues: { closingFloat: updated.closingFloat, cashDeposited: updated.cashDeposited },
  });

  try {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "pos.shift.closed",
      title: `POS shift closed`,
      description: `Closing float: ${updated.closingFloat}`,
      resourceType: "pos_session",
      resourceId: session.id,
      metadata: { closingFloat: updated.closingFloat, cashDeposited: updated.cashDeposited },
    });
  } catch (e) {
    console.error("Timeline emit failed (pos.shift.closed):", e);
  }

  return { session: updated, status: 200 };
}

export async function getActiveSession(ctx: ServerContext) {
  const session = await db.query.posSessions.findFirst({
    where: and(
      eq(posSessions.organizationId, ctx.organizationId),
      eq(posSessions.userId, ctx.userId!),
      eq(posSessions.status, "open")
    ),
    orderBy: (s, { desc }) => [desc(s.openedAt)],
  });

  return session ?? null;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(ctx: ServerContext, body: unknown) {
  const parsed = posOrderSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, status: 400 };
  }

  const activeSession = await getActiveSession(ctx);
  if (!activeSession) {
    return { error: "No active POS session. Open a shift first.", status: 400 };
  }

  const items = parsed.data.items;
  const totals = computeLineTotals(
    items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      taxRate: i.taxRate,
    })),
    parsed.data.taxRate
  );

  const orderTotal = round2(totals.total - Number(parsed.data.discount));
  const orderSubtotal = round2(totals.subtotal);
  const orderTax = round2(totals.taxAmount);

  const orderNumber = await nextOrderNumber(ctx.organizationId);

  const [order] = await db
    .insert(posOrders)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      sessionId: activeSession.id,
      clientId: parsed.data.clientId || null,
      warehouseId: parsed.data.warehouseId || null,
      orderNumber,
      status: "draft",
      currency: parsed.data.currency,
      subtotal: orderSubtotal.toString(),
      taxRate: parsed.data.taxRate.toString(),
      taxAmount: orderTax.toString(),
      discount: parsed.data.discount.toString(),
      total: orderTotal.toString(),
      amountPaid: "0",
      changeDue: "0",
      notes: parsed.data.notes ?? null,
    })
    .returning();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lineTotals = computeLineTotals(
      [{ quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, taxRate: item.taxRate }],
      parsed.data.taxRate
    );
    await db.insert(posOrderItems).values({
      organizationId: ctx.organizationId,
      orderId: order.id,
      productId: item.productId,
      warehouseId: parsed.data.warehouseId || null,
      description: "",
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discount: item.discount.toString(),
      taxRate: item.taxRate.toString(),
      lineTotal: lineTotals.total.toString(),
      sortOrder: i,
    });
  }

  await logAuditSafe(ctx, {
    action: "pos.order.create",
    category: "pos",
    resourceType: "pos_order",
    resourceId: order.id,
    description: `Created POS order ${order.orderNumber}`,
    newValues: { orderNumber: order.orderNumber, total: order.total, items: items.length },
  });

  try {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "pos.sale.created",
      title: `POS order ${order.orderNumber} created`,
      description: `Total ${order.currency} ${order.total}`,
      resourceType: "pos_order",
      resourceId: order.id,
      metadata: { orderNumber: order.orderNumber, total: order.total, status: order.status },
    });
  } catch (e) {
    console.error("Timeline emit failed (pos.sale.created):", e);
  }

  return { order, status: 201 };
}

export async function getOrder(ctx: ServerContext, orderId: string) {
  const order = await db.query.posOrders.findFirst({
    where: and(
      eq(posOrders.id, orderId),
      eq(posOrders.organizationId, ctx.organizationId)
    ),
    with: {
      items: true,
      payments: true,
      session: { columns: { id: true, terminalName: true, status: true } },
      client: { columns: { id: true, name: true, email: true, phone: true } },
      warehouse: { columns: { id: true, name: true } },
      returns: { with: { items: true } },
    },
  });

  if (!order) {
    return { error: "Order not found", status: 404 };
  }

  return { order, status: 200 };
}

export async function listOrders(ctx: ServerContext, options: { status?: string; limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const where = [eq(posOrders.organizationId, ctx.organizationId)];
  if (options.status) {
    where.push(eq(posOrders.status, options.status as PosOrderStatus));
  }

  const [orders, totalResult] = await Promise.all([
    db.query.posOrders.findMany({
      where: and(...where),
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      limit,
      offset,
      with: {
        items: { limit: 1 },
        payments: { limit: 1 },
        client: { columns: { id: true, name: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(posOrders).where(and(...where)),
  ]);

  return {
    orders,
    total: Number(totalResult[0]?.count ?? 0),
    limit,
    offset,
    status: 200,
  };
}

export async function completeOrder(ctx: ServerContext, orderId: string, payments: { amount: number; method: string; reference?: string; phoneNumber?: string; notes?: string }[]) {
  const orderResult = await getOrder(ctx, orderId);
  if ("error" in orderResult) return orderResult;

  const order = orderResult.order as any;

  if (order.status === "completed") {
    return { error: "Order already completed", status: 400 };
  }
  if (order.status === "cancelled") {
    return { error: "Cannot complete a cancelled order", status: 400 };
  }

  const totalAmount = Number(order.total);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (Math.abs(totalPaid - totalAmount) > 0.01 && totalPaid < totalAmount) {
    return { error: `Insufficient payment. Total is ${totalAmount}, paid ${totalPaid}`, status: 400 };
  }

  const changeDue = totalPaid > totalAmount ? round2(totalPaid - totalAmount) : 0;
  const primaryMethod = payments[0]?.method || "cash";

  const createdPayments: PosOrderPayment[] = [];
  for (const payment of payments) {
    const [created] = await db
      .insert(posOrderPayments)
      .values({
        organizationId: ctx.organizationId,
        orderId: order.id,
        amount: payment.amount.toString(),
        method: payment.method,
        reference: payment.reference ?? null,
        phoneNumber: payment.phoneNumber ?? null,
        notes: payment.notes ?? null,
        status: "completed",
        paidAt: new Date(),
      })
      .returning();
    createdPayments.push(created);
  }

  const [updatedOrder] = await db
    .update(posOrders)
    .set({
      status: "completed",
      paymentMethod: primaryMethod,
      paymentStatus: "completed",
      amountPaid: totalPaid.toString(),
      changeDue: changeDue.toString(),
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posOrders.id, orderId))
    .returning();

  const warehouseId = order.warehouseId;
  if (warehouseId) {
    for (const item of order.items) {
      await applyStockDelta({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        productId: item.productId,
        warehouseId,
        delta: -Number(item.quantity),
        type: "sale",
        referenceId: order.id,
        referenceType: "pos_order",
        notes: `POS sale ${order.orderNumber}`,
      });
    }
  }

  let invoiceId: string | undefined;
  try {
    const client = order.clientId ? await db.query.clients.findFirst({
      where: and(eq(clients.id, order.clientId), eq(clients.organizationId, ctx.organizationId)),
    }) : null;

    const [invoice] = await db
      .insert(invoices)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        clientId: order.clientId || null,
        invoiceNumber: `INV-${order.orderNumber}`,
        issueDate: new Date(),
        dueDate: new Date(),
        currency: order.currency,
        subtotal: order.subtotal,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        total: order.total,
        amountPaid: order.total,
        status: "paid",
        sentAt: new Date(),
        paidAt: new Date(),
      })
      .returning();

    invoiceId = invoice.id;

    const productIds = Array.from(new Set(order.items.map((i: any) => i.productId))) as string[];
    const products = await db.query.inventoryProducts.findMany({
      where: and(eq(inventoryProducts.organizationId, ctx.organizationId), inArray(inventoryProducts.id, productIds as string[])),
      columns: { id: true, name: true },
    });
    const productNameMap = new Map<string, string>(products.map((p: any) => [p.id, p.name]));

    await db.insert(invoiceItems).values(
      order.items.map((item: any, index: number) => ({
        invoiceId: invoice.id,
        description: item.description || (productNameMap.get(item.productId) as string) || "Product",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.lineTotal,
        sortOrder: index,
      }))
    );

    await db
      .update(posOrders)
      .set({ invoiceId: invoice.id })
      .where(eq(posOrders.id, orderId));
  } catch (e) {
    console.error("Invoice creation failed:", e);
  }

  try {
    await ensureAccount(ctx.organizationId, ctx.userId!, "inventory");
    await ensureAccount(ctx.organizationId, ctx.userId!, "cash");
    await ensureAccount(ctx.organizationId, ctx.userId!, "inputVat");

    await postProcurementJournalEntry({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      date: new Date(),
      description: `POS Sale ${order.orderNumber}`,
      lines: [
        { accountKey: "cash", debit: Number(order.total) as any, credit: 0 as any, description: `POS Sale ${order.orderNumber}` },
        { accountKey: "inventory", debit: 0 as any, credit: Number(order.subtotal) as any, description: `Revenue ${order.orderNumber}` },
        { accountKey: "inputVat", debit: 0 as any, credit: Number(order.taxAmount) as any, description: `VAT ${order.orderNumber}` },
      ],
      status: "posted",
    });
  } catch (e) {
    console.error("Bookkeeping entry failed:", e);
  }

  if (invoiceId) {
    try {
      const config = await db.query.etimsConfig.findFirst({
        where: and(eq(etimsConfig.organizationId, ctx.organizationId), eq(etimsConfig.isActive, true)),
      });

      if (config) {
        const decrypted = decryptConfigSecrets(config);
        if (decrypted?.isActive) {
          const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, invoiceId),
            with: { client: true, items: true },
          });

          if (invoice) {
            try {
              const etimsResult = await submitInvoiceToEtims(decrypted as EtimsConfigLike, {
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                currency: invoice.currency,
                subtotal: Number(invoice.subtotal),
                taxAmount: Number(invoice.taxAmount),
                total: Number(invoice.total),
                customerName: invoice.client ? (invoice.client as any).name : null,
                items: invoice.items.map((it: any) => ({
                  description: it.description,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  amount: it.amount,
                })),
              });

              const etimsStatus = etimsResult.status === "submitted" || etimsResult.status === "validated" ? "submitted" : "failed";

              if (etimsStatus === "submitted") {
                await db
                  .update(posOrders)
                  .set({
                    etimsStatus: "submitted",
                    etimsInvoiceNumber: etimsResult.etimsInvoiceNumber || null,
                  })
                  .where(eq(posOrders.id, orderId));

                await db.insert(etimsComplianceLogs).values({
                  organizationId: ctx.organizationId,
                  userId: ctx.userId!,
                  action: "etims_invoice.submit",
                  details: {
                    resourceType: "pos_order",
                    resourceId: order.id,
                    description: `eTIMS submission for POS order ${order.orderNumber}`,
                    status: "success",
                    etimsInvoiceNumber: etimsResult.etimsInvoiceNumber,
                  },
                });
              } else {
                await db
                  .update(posOrders)
                  .set({ etimsStatus: "failed" })
                  .where(eq(posOrders.id, orderId));

                await db.insert(etimsComplianceLogs).values({
                  organizationId: ctx.organizationId,
                  userId: ctx.userId!,
                  action: "etims_invoice.submit",
                  details: {
                    resourceType: "pos_order",
                    resourceId: order.id,
                    description: `eTIMS submission failed for POS order ${order.orderNumber}`,
                    status: "failed",
                  },
                });
              }
            } catch (etimsErr) {
              console.error("eTIMS submission error:", etimsErr);
            }
          }
        }
      }
    } catch (e) {
      console.error("eTIMS submission failed:", e);
    }
  }

  await logAuditSafe(ctx, {
    action: "pos.order.complete",
    category: "pos",
    resourceType: "pos_order",
    resourceId: order.id,
    description: `Completed POS order ${order.orderNumber}`,
    newValues: { orderNumber: order.orderNumber, total: order.total, method: primaryMethod, changeDue },
  });

  try {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "pos.sale.completed",
      title: `POS order ${order.orderNumber} completed`,
      description: `Total ${order.currency} ${order.total} via ${primaryMethod}`,
      resourceType: "pos_order",
      resourceId: order.id,
      metadata: { orderNumber: order.orderNumber, total: order.total, method: primaryMethod, changeDue },
    });
  } catch (e) {
    console.error("Timeline emit failed (pos.sale.completed):", e);
  }

  await createNotification({
    organizationId: ctx.organizationId,
    category: "pos",
    type: "pos_sale_completed",
    title: "POS Sale Completed",
    message: `Order ${order.orderNumber} completed for ${order.currency} ${order.total}`,
    priority: "normal",
    deepLink: `/dashboard/pos`,
  });

  return { order: updatedOrder, payments: createdPayments, status: 200 };
}

export async function cancelOrder(ctx: ServerContext, orderId: string) {
  const orderResult = await getOrder(ctx, orderId);
  if ("error" in orderResult) return orderResult;

  const order = orderResult.order as PosOrder;

  if (order.status === "completed") {
    return { error: "Cannot cancel a completed order. Process a return instead.", status: 400 };
  }
  if (order.status === "cancelled") {
    return { error: "Order already cancelled", status: 400 };
  }

  const [updated] = await db
    .update(posOrders)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posOrders.id, orderId))
    .returning();

  await logAuditSafe(ctx, {
    action: "pos.order.cancel",
    category: "pos",
    resourceType: "pos_order",
    resourceId: order.id,
    description: `Cancelled POS order ${order.orderNumber}`,
  });

  try {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "pos.sale.cancelled",
      title: `POS order ${order.orderNumber} cancelled`,
      resourceType: "pos_order",
      resourceId: order.id,
      metadata: { orderNumber: order.orderNumber },
    });
  } catch (e) {
    console.error("Timeline emit failed (pos.sale.cancelled):", e);
  }

  return { order: updated, status: 200 };
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function addPayment(ctx: ServerContext, orderId: string, body: unknown) {
  const parsed = posPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, status: 400 };
  }

  const orderResult = await getOrder(ctx, orderId);
  if ("error" in orderResult) return orderResult;

  const order = orderResult.order as PosOrder;

  if (order.status !== "draft") {
    return { error: "Can only add payments to draft orders", status: 400 };
  }

  const currentPaid = Number(order.amountPaid);
  const total = Number(order.total);
  const newPaid = round2(currentPaid + parsed.data.amount);

  const [payment] = await db
    .insert(posOrderPayments)
    .values({
      organizationId: ctx.organizationId,
      orderId: order.id,
      amount: parsed.data.amount.toString(),
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      phoneNumber: parsed.data.phoneNumber ?? null,
      notes: parsed.data.notes ?? null,
      status: "completed",
      paidAt: new Date(),
    })
    .returning();

  const isFullyPaid = newPaid >= total;
  await db
    .update(posOrders)
    .set({
      amountPaid: newPaid.toString(),
      paymentStatus: isFullyPaid ? "completed" : "pending",
      paymentMethod: parsed.data.method,
      updatedAt: new Date(),
    })
    .where(eq(posOrders.id, orderId));

  return { payment, status: 201 };
}

// ── Returns ───────────────────────────────────────────────────────────────────

export async function createReturn(ctx: ServerContext, orderId: string, body: unknown) {
  const parsed = posReturnSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, status: 400 };
  }

  const orderResult = await getOrder(ctx, orderId);
  if ("error" in orderResult) return orderResult;

  const order = orderResult.order as PosOrder;

  if (order.status !== "completed") {
    return { error: "Can only return completed orders", status: 400 };
  }

  const returnNumber = await nextReturnNumber(ctx.organizationId);
  const totals = computeLineTotals(
    parsed.data.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    Number(order.taxRate)
  );

  const [returnRecord] = await db
    .insert(posReturns)
    .values({
      organizationId: ctx.organizationId,
      orderId: order.id,
      userId: ctx.userId!,
      returnNumber,
      reason: parsed.data.reason,
      description: parsed.data.description ?? null,
      subtotal: totals.subtotal.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      refundMethod: "cash",
      refundStatus: "pending",
    })
    .returning();

  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i];
    const lineTotals = computeLineTotals(
      [{ quantity: item.quantity, unitPrice: item.unitPrice }],
      Number(order.taxRate)
    );
    await db.insert(posReturnItems).values({
      returnId: returnRecord.id,
      orderItemId: null,
      productId: item.productId,
      warehouseId: order.warehouseId || null,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      lineTotal: lineTotals.total.toString(),
      sortOrder: i,
    });
  }

  await db
    .update(posOrders)
    .set({
      status: "refunded",
      updatedAt: new Date(),
    })
    .where(eq(posOrders.id, orderId));

  if (order.warehouseId) {
    for (const item of parsed.data.items) {
      await applyStockDelta({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        productId: item.productId,
        warehouseId: order.warehouseId,
        delta: Number(item.quantity),
        type: "return",
        referenceId: returnRecord.id,
        referenceType: "pos_return",
        notes: `POS return ${returnNumber}`,
      });
    }
  }

  await logAuditSafe(ctx, {
    action: "pos.return.create",
    category: "pos",
    resourceType: "pos_return",
    resourceId: returnRecord.id,
    description: `Created return ${returnNumber} for order ${order.orderNumber}`,
    newValues: { returnNumber: returnRecord.id, total: returnRecord.total },
  });

  try {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "pos.sale.refunded",
      title: `Return ${returnNumber} created`,
      description: `Refund ${order.currency} ${returnRecord.total} for order ${order.orderNumber}`,
      resourceType: "pos_return",
      resourceId: returnRecord.id,
      metadata: { returnNumber, orderNumber: order.orderNumber, total: returnRecord.total },
    });
  } catch (e) {
    console.error("Timeline emit failed (pos.sale.refunded):", e);
  }

  return { return: returnRecord, status: 201 };
}

// ── Dashboard stats ────────────────────────────────────────────────────────────

export async function getPosStats(ctx: ServerContext) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todaySales,
    todayOrders,
    todayAvgOrder,
    recentOrders,
  ] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${posOrders.total}),0)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, ctx.organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, today)
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, ctx.organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, today)
      )),
    db.select({ avg: sql<number>`coalesce(avg(${posOrders.total}),0)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, ctx.organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, today)
      )),
    db.query.posOrders.findMany({
      where: and(
        eq(posOrders.organizationId, ctx.organizationId),
        eq(posOrders.status, "completed")
      ),
      orderBy: (o, { desc }) => [desc(o.completedAt)],
      limit: 10,
      with: {
        client: { columns: { id: true, name: true } },
        payments: { limit: 1, columns: { method: true, amount: true } },
      },
    }),
  ]);

  return {
    todaySales: Number(todaySales[0]?.total ?? 0),
    todayOrders: Number(todayOrders[0]?.count ?? 0),
    todayAvgOrder: Number(todayAvgOrder[0]?.avg ?? 0),
    recentOrders: recentOrders as PosOrder[],
  };
}
