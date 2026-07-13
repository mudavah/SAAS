/**
 * KaziFlow — Procurement service (Epic 3)
 * ------------------------------------------------------------------
 * Central business logic for the procurement module. Every operation is
 * multi-tenant (scoped by organizationId), RBAC-gated by the calling route,
 * audited, and emits a Business Timeline event. Integrations:
 *   • Receiving goods  → inventory stock + stock movements
 *   • Purchase invoices → bookkeeping journal entries
 *   • Supplier payments → bookkeeping journal entries + supplier balances
 *   • AI               → purchase recommendations & low-stock suggestions
 */
import { db } from "@/db";
import {
  procurementPurchaseRequests,
  procurementPurchaseRequestItems,
  procurementRfqs,
  procurementRfqItems,
  procurementRfqSuppliers,
  procurementSupplierQuotations,
  procurementSupplierQuotationItems,
  procurementPurchaseOrders,
  procurementPurchaseOrderItems,
  procurementApprovals,
  procurementGrns,
  procurementGrnItems,
  procurementSupplierReturns,
  procurementSupplierReturnItems,
  procurementPurchaseInvoices,
  procurementPurchaseInvoiceItems,
  procurementSupplierPayments,
  procurementBudgets,
  procurementAiRecommendations,
  inventoryProducts,
  inventorySuppliers,
  inventoryWarehouses,
  organizations,
  organizationMembers,
  type ProcurementPurchaseRequest,
  type ProcurementPurchaseOrder,
  type ProcurementPOStatus,
  type ProcurementApproval,
} from "@/db/schema";
import { and, desc, eq, gte, lte, sql, sum, count, inArray } from "drizzle-orm";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { applyStockReceipt, applyStockReturn } from "./stock";
import { postProcurementJournalEntry } from "./accounts";
import {
  createApprovalChain,
  approveNextLevel,
  rejectChain,
  type ApprovalLevelDef,
} from "./approvals";
import type { ServerContext } from "@/lib/session";
import {
  procurementPurchaseRequestSchema,
  procurementRfqSchema,
  procurementSupplierQuotationSchema,
  procurementPurchaseOrderSchema,
  procurementGrnSchema,
  procurementSupplierReturnSchema,
  procurementPurchaseInvoiceSchema,
  procurementSupplierPaymentSchema,
  procurementBudgetSchema,
} from "@/lib/validations";

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ── Number generation ─────────────────────────────────────────────────────────

async function nextNumber(
  table: any,
  _column: string,
  organizationId: string,
  prefix: string
): Promise<string> {
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(table)
    .where(eq(table.organizationId, organizationId));
  const n = Number(rows[0]?.c || 0) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

// ── Money helpers ──────────────────────────────────────────────────────────────

export interface LineTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function computeLineTotals(
  items: { quantity: number; unitCost: number; taxRate?: number }[],
  defaultTaxRate = 16
): LineTotals {
  let subtotal = 0;
  let taxAmount = 0;
  for (const it of items) {
    const qty = Number(it.quantity);
    const cost = Number(it.unitCost);
    const line = qty * cost;
    const rate = Number(it.taxRate ?? defaultTaxRate) / 100;
    subtotal += line;
    taxAmount += line * rate;
  }
  return {
    subtotal: round2(subtotal),
    taxAmount: round2(taxAmount),
    total: round2(subtotal + taxAmount),
  };
}

// ── Purchase Requests ─────────────────────────────────────────────────────────

export async function createPurchaseRequest(ctx: ServerContext, body: unknown) {
  const parsed = procurementPurchaseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, status: 400 };
  }
  const data = parsed.data;
  const requestNumber = await nextNumber(
    procurementPurchaseRequests,
    "requestNumber",
    ctx.organizationId,
    "PR"
  );
  const totals = computeLineTotals(
    data.items.map((i) => ({ quantity: i.quantity, unitCost: i.estUnitCost, taxRate: 0 }))
  );

  const [request] = await db
    .insert(procurementPurchaseRequests)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      requestNumber,
      title: data.title,
      department: data.department ?? null,
      requesterId: data.requesterId ?? ctx.userId!,
      status: "draft",
      priority: data.priority,
      notes: data.notes ?? null,
      requestedDate: data.requestedDate,
      neededBy: data.neededBy ?? null,
      currency: data.currency,
      totalEstimated: totals.total.toString(),
    })
    .returning();

  await db.insert(procurementPurchaseRequestItems).values(
    data.items.map((item) => ({
      organizationId: ctx.organizationId,
      requestId: request.id,
      productId: item.productId ?? null,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      estUnitCost: item.estUnitCost.toString(),
      lineTotal: round2(Number(item.quantity) * Number(item.estUnitCost)).toString(),
    }))
  );

  await logAuditSafe(ctx, {
    action: "procurement.request.create",
    category: "purchasing",
    resourceType: "procurement_purchase_request",
    resourceId: request.id,
    description: `Created purchase request ${request.requestNumber}`,
    newValues: { requestNumber: request.requestNumber, total: request.totalEstimated },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.request.created",
    title: `Purchase request ${request.requestNumber} created`,
    description: data.title,
    resourceType: "procurement_purchase_request",
    resourceId: request.id,
    metadata: { total: request.totalEstimated },
  });

  return { request, status: 201 };
}

export async function submitPurchaseRequest(ctx: ServerContext, id: string) {
  const request = await db.query.procurementPurchaseRequests.findFirst({
    where: and(
      eq(procurementPurchaseRequests.id, id),
      eq(procurementPurchaseRequests.organizationId, ctx.organizationId)
    ),
  });
  if (!request) return { error: "Purchase request not found", status: 404 };
  if (request.status !== "draft")
    return { error: "Only draft requests can be submitted", status: 400 };

  const total = Number(request.totalEstimated);
  await createApprovalChain({
    organizationId: ctx.organizationId,
    resourceType: "purchase_request",
    resourceId: request.id,
    total,
  });

  await db
    .update(procurementPurchaseRequests)
    .set({ status: "pending_approval", updatedAt: new Date() })
    .where(eq(procurementPurchaseRequests.id, request.id));

  await logAuditSafe(ctx, {
    action: "procurement.request.submit",
    category: "purchasing",
    resourceType: "procurement_purchase_request",
    resourceId: request.id,
    description: `Submitted purchase request ${request.requestNumber} for approval`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.request.created",
    title: `Purchase request ${request.requestNumber} submitted for approval`,
    resourceType: "procurement_purchase_request",
    resourceId: request.id,
  });
  await notifyApprovers(ctx, "purchase_request", request.id, request.requestNumber, total);

  return { request: { ...request, status: "pending_approval" }, status: 200 };
}

export async function decidePurchaseRequest(
  ctx: ServerContext,
  id: string,
  decision: "approve" | "reject",
  comments?: string
) {
  const request = await db.query.procurementPurchaseRequests.findFirst({
    where: and(
      eq(procurementPurchaseRequests.id, id),
      eq(procurementPurchaseRequests.organizationId, ctx.organizationId)
    ),
  });
  if (!request) return { error: "Purchase request not found", status: 404 };
  if (request.status !== "pending_approval")
    return { error: "Request is not pending approval", status: 400 };

  let result;
  if (decision === "approve") {
    result = await approveNextLevel({
      organizationId: ctx.organizationId,
      resourceType: "purchase_request",
      resourceId: id,
      approverId: ctx.userId!,
      comments,
    });
  } else {
    result = { chain: await rejectChain({
      organizationId: ctx.organizationId,
      resourceType: "purchase_request",
      resourceId: id,
      approverId: ctx.userId!,
      comments,
    }) };
  }

  const approved = (result as any).fullyApproved === true;
  const rejected = decision === "reject" || result.chain.some((a: ProcurementApproval) => a.status === "rejected");

  const newStatus = rejected ? "rejected" : approved ? "approved" : "pending_approval";
  await db
    .update(procurementPurchaseRequests)
    .set({
      status: newStatus,
      approvedBy: rejected ? null : ctx.userId,
      approvedAt: rejected ? null : new Date(),
      rejectionReason: decision === "reject" ? comments ?? "Rejected" : null,
      updatedAt: new Date(),
    })
    .where(eq(procurementPurchaseRequests.id, request.id));

  await logAuditSafe(ctx, {
    action: `procurement.request.${decision === "approve" ? "approve" : "reject"}`,
    category: "purchasing",
    resourceType: "procurement_purchase_request",
    resourceId: request.id,
    description: `${decision === "approve" ? "Approved" : "Rejected"} purchase request ${request.requestNumber}`,
    newValues: { status: newStatus },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: rejected ? "procurement.request.rejected" : "procurement.request.approved",
    title: `Purchase request ${request.requestNumber} ${rejected ? "rejected" : approved ? "approved" : "advanced"}`,
    resourceType: "procurement_purchase_request",
    resourceId: request.id,
  });
  if (approved || rejected) {
    await createNotification({
      organizationId: ctx.organizationId,
      userId: request.requesterId,
      category: "inventory",
      type: "purchase_request_decision",
      title: `Purchase request ${request.requestNumber} ${rejected ? "rejected" : "approved"}`,
      message: `${request.title} was ${rejected ? "rejected" : "approved"}.`,
      deepLink: `/dashboard/procurement/requests/${request.id}`,
    });
  }

  return { request: { ...request, status: newStatus }, status: 200 };
}

// ── RFQs ──────────────────────────────────────────────────────────────────────

export async function createRfq(ctx: ServerContext, body: unknown) {
  const parsed = procurementRfqSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const rfqNumber = await nextNumber(procurementRfqs, "rfqNumber", ctx.organizationId, "RFQ");

  // Validate suppliers belong to org.
  const suppliers = await db.query.inventorySuppliers.findMany({
    where: and(eq(inventorySuppliers.organizationId, ctx.organizationId)),
    columns: { id: true },
  });
  const validSupplierIds = new Set(suppliers.map((s) => s.id));
  if (data.supplierIds.some((s) => !validSupplierIds.has(s)))
    return { error: "One or more suppliers are invalid", status: 404 };

  const [rfq] = await db
    .insert(procurementRfqs)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      rfqNumber,
      title: data.title,
      status: "draft",
      validUntil: data.validUntil ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  await db.insert(procurementRfqItems).values(
    data.items.map((item) => ({
      organizationId: ctx.organizationId,
      rfqId: rfq.id,
      productId: item.productId ?? null,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
    }))
  );
  await db.insert(procurementRfqSuppliers).values(
    data.supplierIds.map((supplierId) => ({
      organizationId: ctx.organizationId,
      rfqId: rfq.id,
      supplierId,
    }))
  );

  await logAuditSafe(ctx, {
    action: "procurement.rfq.create",
    category: "purchasing",
    resourceType: "procurement_rfq",
    resourceId: rfq.id,
    description: `Created RFQ ${rfq.rfqNumber}`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.rfq.created",
    title: `RFQ ${rfq.rfqNumber} created`,
    description: data.title,
    resourceType: "procurement_rfq",
    resourceId: rfq.id,
  });

  return { rfq, status: 201 };
}

export async function sendRfq(ctx: ServerContext, id: string) {
  const rfq = await db.query.procurementRfqs.findFirst({
    where: and(eq(procurementRfqs.id, id), eq(procurementRfqs.organizationId, ctx.organizationId)),
  });
  if (!rfq) return { error: "RFQ not found", status: 404 };
  if (rfq.status !== "draft") return { error: "RFQ already sent", status: 400 };

  await db
    .update(procurementRfqs)
    .set({ status: "sent", issuedDate: new Date(), updatedAt: new Date() })
    .where(eq(procurementRfqs.id, rfq.id));

  await logAuditSafe(ctx, {
    action: "procurement.rfq.send",
    category: "purchasing",
    resourceType: "procurement_rfq",
    resourceId: rfq.id,
    description: `Sent RFQ ${rfq.rfqNumber} to suppliers`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.rfq.sent",
    title: `RFQ ${rfq.rfqNumber} sent`,
    resourceType: "procurement_rfq",
    resourceId: rfq.id,
  });

  return { rfq: { ...rfq, status: "sent" }, status: 200 };
}

// ── Supplier Quotations ─────────────────────────────────────────────────────────

export async function createSupplierQuotation(ctx: ServerContext, body: unknown) {
  const parsed = procurementSupplierQuotationSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const quotationNumber = await nextNumber(
    procurementSupplierQuotations,
    "quotationNumber",
    ctx.organizationId,
    "SQ"
  );
  const totals = computeLineTotals(
    data.items.map((i) => ({ quantity: i.quantity, unitCost: i.unitPrice, taxRate: data.taxRate }))
  );

  const [quotation] = await db
    .insert(procurementSupplierQuotations)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      rfqId: data.rfqId ?? null,
      supplierId: data.supplierId,
      quotationNumber,
      status: "received",
      receivedDate: data.receivedDate,
      validUntil: data.validUntil ?? null,
      currency: data.currency,
      subtotal: totals.subtotal.toString(),
      taxRate: data.taxRate.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      notes: data.notes ?? null,
    })
    .returning();

  await db.insert(procurementSupplierQuotationItems).values(
    data.items.map((item) => {
      const lineTotal = round2(Number(item.quantity) * Number(item.unitPrice));
      return {
        organizationId: ctx.organizationId,
        quotationId: quotation.id,
        rfqItemId: item.rfqItemId ?? null,
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        lineTotal: lineTotal.toString(),
      };
    })
  );

  await logAuditSafe(ctx, {
    action: "procurement.quotation.create",
    category: "purchasing",
    resourceType: "procurement_supplier_quotation",
    resourceId: quotation.id,
    description: `Recorded supplier quotation ${quotation.quotationNumber}`,
    newValues: { total: quotation.total, supplierId: quotation.supplierId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.quotation.received",
    title: `Supplier quotation ${quotation.quotationNumber} received`,
    resourceType: "procurement_supplier_quotation",
    resourceId: quotation.id,
    metadata: { total: quotation.total },
  });

  return { quotation, status: 201 };
}

export async function decideQuotation(
  ctx: ServerContext,
  id: string,
  decision: "accept" | "reject"
) {
  const quotation = await db.query.procurementSupplierQuotations.findFirst({
    where: and(
      eq(procurementSupplierQuotations.id, id),
      eq(procurementSupplierQuotations.organizationId, ctx.organizationId)
    ),
  });
  if (!quotation) return { error: "Quotation not found", status: 404 };
  const status = decision === "accept" ? "accepted" : "rejected";
  await db
    .update(procurementSupplierQuotations)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(procurementSupplierQuotations.id, quotation.id));

  await logAuditSafe(ctx, {
    action: `procurement.quotation.${decision}`,
    category: "purchasing",
    resourceType: "procurement_supplier_quotation",
    resourceId: quotation.id,
    description: `${decision === "accept" ? "Accepted" : "Rejected"} supplier quotation ${quotation.quotationNumber}`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: decision === "accept" ? "procurement.quotation.accepted" : "procurement.quotation.received",
    title: `Supplier quotation ${quotation.quotationNumber} ${status}`,
    resourceType: "procurement_supplier_quotation",
    resourceId: quotation.id,
  });

  return { quotation: { ...quotation, status }, status: 200 };
}

// ── Purchase Orders ────────────────────────────────────────────────────────────

export async function createPurchaseOrder(ctx: ServerContext, body: unknown) {
  const parsed = procurementPurchaseOrderSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const poNumber = await nextNumber(procurementPurchaseOrders, "poNumber", ctx.organizationId, "PO");
  const totals = computeLineTotals(
    data.items.map((i) => ({ quantity: i.quantity, unitCost: i.unitCost, taxRate: i.taxRate ?? data.taxRate }))
  );

  const [po] = await db
    .insert(procurementPurchaseOrders)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      poNumber,
      requestId: data.requestId ?? null,
      rfqId: data.rfqId ?? null,
      supplierId: data.supplierId ?? null,
      budgetId: data.budgetId ?? null,
      status: "draft",
      orderDate: data.orderDate,
      expectedDate: data.expectedDate ?? null,
      currency: data.currency,
      subtotal: totals.subtotal.toString(),
      taxRate: data.taxRate.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      notes: data.notes ?? null,
      approvalStatus: "pending",
      currentApprovalLevel: 0,
    })
    .returning();

  await db.insert(procurementPurchaseOrderItems).values(
    data.items.map((item) => {
      const lineTotal = round2(Number(item.quantity) * Number(item.unitCost));
      const taxRate = Number(item.taxRate ?? data.taxRate);
      const taxAmount = round2(lineTotal * (taxRate / 100));
      return {
        organizationId: ctx.organizationId,
        purchaseOrderId: po.id,
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitCost: item.unitCost.toString(),
        taxRate: taxRate.toString(),
        taxAmount: taxAmount.toString(),
        lineTotal: lineTotal.toString(),
        receivedQuantity: "0",
        warehouseId: item.warehouseId ?? null,
      };
    })
  );

  await logAuditSafe(ctx, {
    action: "procurement.po.create",
    category: "purchasing",
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
    description: `Created purchase order ${po.poNumber}`,
    newValues: { poNumber: po.poNumber, total: po.total, supplierId: po.supplierId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.po.created",
    title: `Purchase order ${po.poNumber} created`,
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
    metadata: { total: po.total },
  });

  return { po, status: 201 };
}

export async function submitPurchaseOrder(ctx: ServerContext, id: string) {
  const po = await db.query.procurementPurchaseOrders.findFirst({
    where: and(
      eq(procurementPurchaseOrders.id, id),
      eq(procurementPurchaseOrders.organizationId, ctx.organizationId)
    ),
  });
  if (!po) return { error: "Purchase order not found", status: 404 };
  if (po.status !== "draft")
    return { error: "Only draft purchase orders can be submitted", status: 400 };

  await createApprovalChain({
    organizationId: ctx.organizationId,
    resourceType: "purchase_order",
    resourceId: po.id,
    total: Number(po.total),
  });

  await db
    .update(procurementPurchaseOrders)
    .set({
      status: "submitted",
      approvalStatus: "pending",
      currentApprovalLevel: 1,
      updatedAt: new Date(),
    })
    .where(eq(procurementPurchaseOrders.id, po.id));

  await logAuditSafe(ctx, {
    action: "procurement.po.submit",
    category: "purchasing",
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
    description: `Submitted purchase order ${po.poNumber} for approval`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.po.submitted",
    title: `Purchase order ${po.poNumber} submitted for approval`,
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
  });
  await notifyApprovers(ctx, "purchase_order", po.id, po.poNumber, Number(po.total));

  return { po: { ...po, status: "submitted" }, status: 200 };
}

export async function decidePurchaseOrder(
  ctx: ServerContext,
  id: string,
  decision: "approve" | "reject",
  comments?: string
) {
  const po = await db.query.procurementPurchaseOrders.findFirst({
    where: and(
      eq(procurementPurchaseOrders.id, id),
      eq(procurementPurchaseOrders.organizationId, ctx.organizationId)
    ),
  });
  if (!po) return { error: "Purchase order not found", status: 404 };
  if (po.status !== "submitted" && po.status !== "approved")
    return { error: "Purchase order is not awaiting approval", status: 400 };

  let result;
  if (decision === "approve") {
    result = await approveNextLevel({
      organizationId: ctx.organizationId,
      resourceType: "purchase_order",
      resourceId: id,
      approverId: ctx.userId!,
      comments,
    });
  } else {
    result = { chain: await rejectChain({
      organizationId: ctx.organizationId,
      resourceType: "purchase_order",
      resourceId: id,
      approverId: ctx.userId!,
      comments,
    }) };
  }

  const approved = (result as any).fullyApproved === true;
  const rejected = decision === "reject" || result.chain.some((a: ProcurementApproval) => a.status === "rejected");

  if (rejected) {
    await db
      .update(procurementPurchaseOrders)
      .set({
        status: "rejected",
        approvalStatus: "rejected",
        rejectionReason: decision === "reject" ? comments ?? "Rejected" : null,
        updatedAt: new Date(),
      })
      .where(eq(procurementPurchaseOrders.id, po.id));
  } else if (approved) {
    await db
      .update(procurementPurchaseOrders)
      .set({
        status: "approved",
        approvalStatus: "approved",
        approvedBy: ctx.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(procurementPurchaseOrders.id, po.id));
    await commitBudget(ctx, po);
  } else {
    // advance to next level
    const nextLevel = result.chain.findIndex((a: ProcurementApproval) => a.status === "pending") + 1;
    await db
      .update(procurementPurchaseOrders)
      .set({ currentApprovalLevel: nextLevel, updatedAt: new Date() })
      .where(eq(procurementPurchaseOrders.id, po.id));
  }

  const finalStatus = rejected ? "rejected" : approved ? "approved" : "submitted";
  await logAuditSafe(ctx, {
    action: `procurement.po.${decision === "approve" ? "approve" : "reject"}`,
    category: "purchasing",
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
    description: `${decision === "approve" ? "Approved" : "Rejected"} purchase order ${po.poNumber}`,
    newValues: { status: finalStatus },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: rejected ? "procurement.po.rejected" : approved ? "procurement.po.approved" : "procurement.po.submitted",
    title: `Purchase order ${po.poNumber} ${rejected ? "rejected" : approved ? "approved" : "advanced"}`,
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
  });
  if (approved || rejected) {
    await createNotification({
      organizationId: ctx.organizationId,
      userId: po.userId,
      category: "inventory",
      type: "purchase_order_decision",
      title: `Purchase order ${po.poNumber} ${rejected ? "rejected" : "approved"}`,
      message: `PO ${po.poNumber} was ${rejected ? "rejected" : "approved"}.`,
      deepLink: `/dashboard/procurement/orders/${po.id}`,
    });
  }

  return { po: { ...po, status: finalStatus }, status: 200 };
}

export async function orderPurchaseOrder(ctx: ServerContext, id: string) {
  const po = await db.query.procurementPurchaseOrders.findFirst({
    where: and(
      eq(procurementPurchaseOrders.id, id),
      eq(procurementPurchaseOrders.organizationId, ctx.organizationId)
    ),
  });
  if (!po) return { error: "Purchase order not found", status: 404 };
  if (po.status !== "approved")
    return { error: "Only approved purchase orders can be ordered", status: 400 };

  await db
    .update(procurementPurchaseOrders)
    .set({ status: "ordered", updatedAt: new Date() })
    .where(eq(procurementPurchaseOrders.id, po.id));

  // Mark the originating request as ordered if linked.
  if (po.requestId) {
    await db
      .update(procurementPurchaseRequests)
      .set({ status: "ordered", updatedAt: new Date() })
      .where(eq(procurementPurchaseRequests.id, po.requestId));
  }

  await logAuditSafe(ctx, {
    action: "procurement.po.order",
    category: "purchasing",
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
    description: `Purchase order ${po.poNumber} placed with supplier`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.po.ordered",
    title: `Purchase order ${po.poNumber} ordered`,
    resourceType: "procurement_purchase_order",
    resourceId: po.id,
  });

  return { po: { ...po, status: "ordered" }, status: 200 };
}

// ── Helpers: approval notifications & budget commitment ────────────────────────

async function notifyApprovers(
  ctx: ServerContext,
  resourceType: "purchase_request" | "purchase_order",
  resourceId: string,
  number: string,
  total: number
) {
  const pending = await db.query.procurementApprovals.findMany({
    where: and(
      eq(procurementApprovals.resourceType, resourceType),
      eq(procurementApprovals.resourceId, resourceId),
      eq(procurementApprovals.status, "pending")
    ),
  });
  const roles = new Set(pending.map((p) => p.requiredRoleType));
  if (roles.size === 0) return;

  const members = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.organizationId, ctx.organizationId),
      eq(organizationMembers.status, "active")
    ),
  });

  for (const member of members) {
    if (member.roleType && roles.has(member.roleType) && member.userId) {
      await createNotification({
        organizationId: ctx.organizationId,
        userId: member.userId,
        category: "inventory",
        type: `approval_required_${resourceType}`,
        title: `Approval required: ${number}`,
        message: `${number} (${resourceType.replace("_", " ")}) totalling ${total} needs your approval.`,
        deepLink: `/dashboard/procurement/approvals`,
      });
    }
  }
}

async function commitBudget(ctx: ServerContext, po: ProcurementPurchaseOrder) {
  if (!po.budgetId) {
    // Try to find an active budget covering the PO order date.
    const budget = await db.query.procurementBudgets.findFirst({
      where: and(
        eq(procurementBudgets.organizationId, ctx.organizationId),
        lte(procurementBudgets.periodStart, po.orderDate),
        gte(procurementBudgets.periodEnd, po.orderDate)
      ),
    });
    if (!budget) return;
    po = { ...po, budgetId: budget.id } as ProcurementPurchaseOrder;
  }

  const budget = await db.query.procurementBudgets.findFirst({
    where: eq(procurementBudgets.id, po.budgetId!),
  });
  if (!budget) return;

  const newSpent = round2(Number(budget.spent) + Number(po.total));
  const exceeded = newSpent > Number(budget.amount);
  await db
    .update(procurementBudgets)
    .set({ spent: newSpent.toString(), updatedAt: new Date() })
    .where(eq(procurementBudgets.id, budget.id));

  if (exceeded) {
    await emitTimelineEvent({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      eventType: "procurement.budget.exceeded",
      title: `Budget "${budget.name}" exceeded`,
      description: `Purchase order ${po.poNumber} committed ${po.total}; budget spent is now ${newSpent} of ${budget.amount}.`,
      resourceType: "procurement_budget",
      resourceId: budget.id,
    });
    await createNotification({
      organizationId: ctx.organizationId,
      userId: null,
      category: "inventory",
      type: "budget_exceeded",
      title: `Budget "${budget.name}" exceeded`,
      message: `Committed spend has exceeded the budget of ${budget.amount} ${budget.currency}.`,
      deepLink: `/dashboard/procurement/budgets`,
    });
  }
}

// ── Goods Received Notes (GRN) ─────────────────────────────────────────────────

export async function createGrn(ctx: ServerContext, poId: string, body: unknown) {
  const parsed = procurementGrnSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const po = (await db.query.procurementPurchaseOrders.findFirst({
    where: and(
      eq(procurementPurchaseOrders.id, poId),
      eq(procurementPurchaseOrders.organizationId, ctx.organizationId)
    ),
    with: { items: true },
  })) as any;
  if (!po) return { error: "Purchase order not found", status: 404 };
  if (po.status !== "approved" && po.status !== "ordered" && po.status !== "partially_received")
    return { error: "Goods can only be received against approved/ordered POs", status: 400 };

  const poItemIds = new Set(po.items.map((i: any) => i.id));
  if (data.items.some((i) => !poItemIds.has(i.poItemId)))
    return { error: "One or more items do not belong to this PO", status: 400 };

  const grnNumber = await nextNumber(procurementGrns, "grnNumber", ctx.organizationId, "GRN");

  const [grn] = await db
    .insert(procurementGrns)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      grnNumber,
      purchaseOrderId: po.id,
      supplierId: po.supplierId ?? null,
      receivedDate: data.receivedDate,
      status: "completed",
      notes: data.notes ?? null,
    })
    .returning();

  for (const item of data.items) {
    const poItem = po.items.find((i: any) => i.id === item.poItemId)!;
    const productId = item.productId ?? poItem.productId ?? null;
    if (!productId) return { error: "Receipt line is missing a product", status: 400 };
    const warehouseId = item.warehouseId;
    const receivedGood = Number(item.quantityReceived) - Number(item.quantityDamaged || 0);
    const unitCost = Number(item.unitCost ?? poItem.unitCost);

    await applyStockReceipt({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      productId,
      warehouseId,
      quantity: receivedGood,
      referenceId: grn.id,
      notes: `GRN ${grn.grnNumber}`,
    });

    await db.insert(procurementGrnItems).values({
      organizationId: ctx.organizationId,
      grnId: grn.id,
      poItemId: poItem.id,
      productId,
      warehouseId,
      quantityReceived: item.quantityReceived.toString(),
      quantityDamaged: (item.quantityDamaged || 0).toString(),
      unitCost: unitCost.toString(),
    });

    await db
      .update(procurementPurchaseOrderItems)
      .set({
        receivedQuantity: sql`${procurementPurchaseOrderItems.receivedQuantity} + ${item.quantityReceived}`,
      })
      .where(eq(procurementPurchaseOrderItems.id, poItem.id));
  }

  // Recompute PO receipt status.
  const updatedItems = await db.query.procurementPurchaseOrderItems.findMany({
    where: eq(procurementPurchaseOrderItems.purchaseOrderId, po.id),
  });
  const allReceived = updatedItems.every(
    (i) => Number(i.receivedQuantity) >= Number(i.quantity)
  );
  const anyReceived = updatedItems.some((i) => Number(i.receivedQuantity) > 0);
  const newStatus: ProcurementPOStatus = allReceived
    ? "received"
    : anyReceived
    ? "partially_received"
    : po.status;
  await db
    .update(procurementPurchaseOrders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(procurementPurchaseOrders.id, po.id));

  await logAuditSafe(ctx, {
    action: "procurement.grn.create",
    category: "purchasing",
    resourceType: "procurement_grn",
    resourceId: grn.id,
    description: `Received goods for PO ${po.poNumber} (GRN ${grn.grnNumber})`,
    newValues: { poNumber: po.poNumber, grnNumber: grn.grnNumber },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.grn.received",
    title: `Goods received for PO ${po.poNumber}`,
    description: `GRN ${grn.grnNumber} updated inventory stock.`,
    resourceType: "procurement_grn",
    resourceId: grn.id,
  });

  return { grn, status: 201 };
}

// ── Supplier Returns ─────────────────────────────────────────────────────────

export async function createSupplierReturn(ctx: ServerContext, body: unknown) {
  const parsed = procurementSupplierReturnSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const returnNumber = await nextNumber(
    procurementSupplierReturns,
    "returnNumber",
    ctx.organizationId,
    "SR"
  );

  const [ret] = await db
    .insert(procurementSupplierReturns)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      returnNumber,
      grnId: data.grnId ?? null,
      purchaseOrderId: data.purchaseOrderId ?? null,
      supplierId: data.supplierId ?? null,
      returnDate: data.returnDate,
      status: "completed",
      reason: data.reason ?? null,
      total: "0",
      notes: data.notes ?? null,
    })
    .returning();

  let total = 0;
  for (const item of data.items) {
    const productId = item.productId ?? null;
    const warehouseId = item.warehouseId ?? null;
    if (productId && warehouseId) {
      await applyStockReturn({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        productId,
        warehouseId,
        quantity: Number(item.quantity),
        referenceId: ret.id,
        notes: `Supplier return ${ret.returnNumber}`,
      });
    }
    const lineTotal = round2(Number(item.quantity) * Number(item.unitCost));
    total += lineTotal;
    await db.insert(procurementSupplierReturnItems).values({
      organizationId: ctx.organizationId,
      returnId: ret.id,
      grnItemId: item.grnItemId ?? null,
      productId,
      warehouseId,
      quantity: item.quantity.toString(),
      unitCost: item.unitCost.toString(),
      lineTotal: lineTotal.toString(),
    });
  }

  await db
    .update(procurementSupplierReturns)
    .set({ total: total.toString(), updatedAt: new Date() })
    .where(eq(procurementSupplierReturns.id, ret.id));

  await logAuditSafe(ctx, {
    action: "procurement.return.create",
    category: "purchasing",
    resourceType: "procurement_supplier_return",
    resourceId: ret.id,
    description: `Created supplier return ${ret.returnNumber}`,
    newValues: { returnNumber: ret.returnNumber, total },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.return.created",
    title: `Supplier return ${ret.returnNumber} created`,
    resourceType: "procurement_supplier_return",
    resourceId: ret.id,
    metadata: { total },
  });

  return { return: ret, status: 201 };
}

// ── Purchase Invoices (supplier) ───────────────────────────────────────────────

export async function createPurchaseInvoice(ctx: ServerContext, body: unknown) {
  const parsed = procurementPurchaseInvoiceSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const invoiceNumber = await nextNumber(
    procurementPurchaseInvoices,
    "invoiceNumber",
    ctx.organizationId,
    "PINV"
  );
  const totals = computeLineTotals(
    data.items.map((i) => ({ quantity: i.quantity, unitCost: i.unitCost, taxRate: i.taxRate ?? data.taxRate }))
  );

  let journalEntryId: string | null = null;
  if (data.postToBookkeeping) {
    const lines: any[] = [
      { accountKey: "inventory", debit: totals.subtotal, credit: 0, description: `Goods from invoice ${invoiceNumber}` },
      { accountKey: "accountsPayable", debit: 0, credit: totals.total, description: `Liability to supplier` },
    ];
    if (totals.taxAmount > 0) {
      lines.push({ accountKey: "inputVat", debit: totals.taxAmount, credit: 0, description: "Input VAT" });
    }
    journalEntryId = await postProcurementJournalEntry({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      date: data.issueDate,
      description: `Purchase invoice ${invoiceNumber}`,
      lines,
    });
  }

  const [invoice] = await db
    .insert(procurementPurchaseInvoices)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      invoiceNumber,
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId ?? null,
      grnId: data.grnId ?? null,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      currency: data.currency,
      subtotal: totals.subtotal.toString(),
      taxRate: data.taxRate.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      amountPaid: "0",
      status: "received",
      journalEntryId,
      notes: data.notes ?? null,
    })
    .returning();

  await db.insert(procurementPurchaseInvoiceItems).values(
    data.items.map((item) => {
      const lineTotal = round2(Number(item.quantity) * Number(item.unitCost));
      const taxRate = Number(item.taxRate ?? data.taxRate);
      return {
        organizationId: ctx.organizationId,
        purchaseInvoiceId: invoice.id,
        poItemId: item.poItemId ?? null,
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity.toString(),
        unitCost: item.unitCost.toString(),
        taxRate: taxRate.toString(),
        taxAmount: round2(lineTotal * (taxRate / 100)).toString(),
        lineTotal: lineTotal.toString(),
      };
    })
  );

  await logAuditSafe(ctx, {
    action: "procurement.invoice.create",
    category: "purchasing",
    resourceType: "procurement_purchase_invoice",
    resourceId: invoice.id,
    description: `Recorded purchase invoice ${invoice.invoiceNumber}`,
    newValues: { invoiceNumber: invoice.invoiceNumber, total: invoice.total, journalEntryId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.invoice.received",
    title: `Purchase invoice ${invoice.invoiceNumber} received`,
    resourceType: "procurement_purchase_invoice",
    resourceId: invoice.id,
    metadata: { total: invoice.total, posted: !!journalEntryId },
  });

  return { invoice, status: 201 };
}

// ── Supplier Payments ─────────────────────────────────────────────────────────

export async function createSupplierPayment(ctx: ServerContext, body: unknown) {
  const parsed = procurementSupplierPaymentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const paymentNumber = await nextNumber(
    procurementSupplierPayments,
    "paymentNumber",
    ctx.organizationId,
    "PAY"
  );

  let journalEntryId: string | null = null;
  if (data.postToBookkeeping) {
    journalEntryId = await postProcurementJournalEntry({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      date: data.paymentDate,
      description: `Supplier payment ${paymentNumber}`,
      lines: [
        { accountKey: "accountsPayable", debit: Number(data.amount), credit: 0, description: "Settle payable" },
        { accountKey: "bank", debit: 0, credit: Number(data.amount), description: `Paid via ${data.method}` },
      ],
    });
  }

  const [payment] = await db
    .insert(procurementSupplierPayments)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      paymentNumber,
      supplierId: data.supplierId,
      purchaseInvoiceId: data.purchaseInvoiceId ?? null,
      amount: data.amount.toString(),
      currency: data.currency,
      method: data.method,
      status: "completed",
      paymentDate: data.paymentDate,
      reference: data.reference ?? null,
      journalEntryId,
      notes: data.notes ?? null,
    })
    .returning();

  if (data.purchaseInvoiceId) {
    const invoice = await db.query.procurementPurchaseInvoices.findFirst({
      where: eq(procurementPurchaseInvoices.id, data.purchaseInvoiceId),
    });
    if (invoice) {
      const newPaid = round2(Number(invoice.amountPaid) + Number(data.amount));
      const status =
        newPaid >= Number(invoice.total) ? "paid" : newPaid > 0 ? "partially_paid" : "received";
      await db
        .update(procurementPurchaseInvoices)
        .set({ amountPaid: newPaid.toString(), status, updatedAt: new Date() })
        .where(eq(procurementPurchaseInvoices.id, invoice.id));
    }
  }

  await logAuditSafe(ctx, {
    action: "procurement.payment.create",
    category: "purchasing",
    resourceType: "procurement_supplier_payment",
    resourceId: payment.id,
    description: `Recorded supplier payment ${payment.paymentNumber}`,
    newValues: { paymentNumber: payment.paymentNumber, amount: payment.amount, supplierId: payment.supplierId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "procurement.payment.made",
    title: `Supplier payment ${payment.paymentNumber} made`,
    resourceType: "procurement_supplier_payment",
    resourceId: payment.id,
    metadata: { amount: payment.amount, method: payment.method },
  });

  return { payment, status: 201 };
}

// ── Budgets ────────────────────────────────────────────────────────────────────

export async function createBudget(ctx: ServerContext, body: unknown) {
  const parsed = procurementBudgetSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message, status: 400 };
  const data = parsed.data;

  const [budget] = await db
    .insert(procurementBudgets)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name: data.name,
      category: data.category ?? null,
      period: data.period,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      currency: data.currency,
      amount: data.amount.toString(),
      spent: "0",
      notes: data.notes ?? null,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "procurement.budget.create",
    category: "purchasing",
    resourceType: "procurement_budget",
    resourceId: budget.id,
    description: `Created budget ${budget.name}`,
    newValues: { amount: budget.amount, period: budget.period },
  });

  return { budget, status: 201 };
}
