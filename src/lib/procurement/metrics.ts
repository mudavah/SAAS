/**
 * KaziFlow — Procurement metrics, supplier performance & reports
 * ------------------------------------------------------------------
 * Read-side analytics for the procurement module: supplier balances &
 * performance scores, low-stock detection, dashboard summary, and report
 * aggregations. All queries are organization-scoped (multi-tenant).
 */
import { db } from "@/db";
import {
  procurementPurchaseRequests,
  procurementRfqs,
  procurementSupplierQuotations,
  procurementPurchaseOrders,
  procurementGrns,
  procurementGrnItems,
  procurementPurchaseInvoices,
  procurementPurchaseInvoiceItems,
  procurementSupplierPayments,
  procurementSupplierReturns,
  procurementBudgets,
  procurementApprovals,
  procurementAiRecommendations,
  inventoryProducts,
  inventoryStock,
  inventorySuppliers,
} from "@/db/schema";
import { and, desc, eq, sql, sum, count, inArray } from "drizzle-orm";

export interface SupplierBalance {
  totalBilled: number;
  totalPaid: number;
  totalReturns: number;
  balance: number;
}

/** Live accounts-payable balance for a supplier (computed, not stored). */
export async function getSupplierBalance(
  organizationId: string,
  supplierId: string
): Promise<SupplierBalance> {
  const [inv] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementPurchaseInvoices.total}::numeric),0)` })
    .from(procurementPurchaseInvoices)
    .where(
      and(
        eq(procurementPurchaseInvoices.organizationId, organizationId),
        eq(procurementPurchaseInvoices.supplierId, supplierId),
        eq(procurementPurchaseInvoices.status, "received")
      )
    );
  const [paid] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementPurchaseInvoices.amountPaid}::numeric),0)` })
    .from(procurementPurchaseInvoices)
    .where(
      and(
        eq(procurementPurchaseInvoices.organizationId, organizationId),
        eq(procurementPurchaseInvoices.supplierId, supplierId)
      )
    );
  const [ret] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementSupplierReturns.total}::numeric),0)` })
    .from(procurementSupplierReturns)
    .where(
      and(
        eq(procurementSupplierReturns.organizationId, organizationId),
        eq(procurementSupplierReturns.supplierId, supplierId),
        eq(procurementSupplierReturns.status, "completed")
      )
    );

  const totalBilled = Number(inv?.total || 0);
  const totalPaid = Number(paid?.total || 0);
  const totalReturns = Number(ret?.total || 0);
  return {
    totalBilled,
    totalPaid,
    totalReturns,
    balance: Math.round((totalBilled - totalPaid - totalReturns + Number.EPSILON) * 100) / 100,
  };
}

export interface SupplierPerformance {
  supplierId: string;
  name: string;
  totalSpend: number;
  poCount: number;
  onTimeDeliveryRate: number;
  avgLeadTimeDays: number | null;
  qualityRate: number;
  openBalance: number;
  rating: number | null;
}

/** Compute a supplier's performance scorecard from historical transactions. */
export async function getSupplierPerformance(
  organizationId: string,
  supplierId: string,
  supplierName: string,
  rating: number | null
): Promise<SupplierPerformance> {
  const [spendRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementPurchaseInvoices.total}::numeric),0)`, count: count() })
    .from(procurementPurchaseInvoices)
    .where(
      and(
        eq(procurementPurchaseInvoices.organizationId, organizationId),
        eq(procurementPurchaseInvoices.supplierId, supplierId)
      )
    );

  // On-time delivery: GRNs received on/before the PO expected date.
  const grns = (await db.query.procurementGrns.findMany({
    where: and(
      eq(procurementGrns.organizationId, organizationId),
      eq(procurementGrns.supplierId, supplierId)
    ),
  })) as any[];
  const poIds = Array.from(new Set(grns.map((g: any) => g.purchaseOrderId).filter(Boolean)));
  const poMap = new Map<string, any>();
  if (poIds.length) {
    const pos = await db.query.procurementPurchaseOrders.findMany({
      where: and(eq(procurementPurchaseOrders.organizationId, organizationId), inArray(procurementPurchaseOrders.id, poIds)),
    });
    for (const po of pos as any[]) poMap.set(po.id, po);
  }
  let onTime = 0;
  let leadTimes: number[] = [];
  for (const grn of grns) {
    const po = poMap.get(grn.purchaseOrderId);
    if (!po) continue;
    if (po.expectedDate && new Date(grn.receivedDate) <= new Date(po.expectedDate)) onTime++;
    const lead = Math.max(
      0,
      (new Date(grn.receivedDate).getTime() - new Date(po.orderDate).getTime()) / 86_400_000
    );
    leadTimes.push(lead);
  }
  const onTimeRate = grns.length ? Math.round((onTime / grns.length) * 100) : 0;
  const avgLead = leadTimes.length
    ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10
    : null;

  // Quality: 1 - (damaged / received) across GRN items.
  const grnIds = grns.map((g) => g.id);
  let damaged = 0;
  let received = 0;
  if (grnIds.length) {
    const items = await db.query.procurementGrnItems.findMany({
      where: and(eq(procurementGrnItems.organizationId, organizationId), inArray(procurementGrnItems.grnId, grnIds)),
    });
    for (const it of items) {
      received += Number(it.quantityReceived);
      damaged += Number(it.quantityDamaged);
    }
  }
  const qualityRate = received ? Math.round(((received - damaged) / received) * 100) : 100;

  const balance = await getSupplierBalance(organizationId, supplierId);
  const spend = Number(spendRow?.total || 0);

  return {
    supplierId,
    name: supplierName,
    totalSpend: spend,
    poCount: grns.length,
    onTimeDeliveryRate: onTimeRate,
    avgLeadTimeDays: avgLead,
    qualityRate,
    openBalance: balance.balance,
    rating,
  };
}

/** Supplier directory enriched with balance + performance. */
export async function listSuppliersWithPerformance(organizationId: string) {
  const suppliers = await db.query.inventorySuppliers.findMany({
    where: and(
      eq(inventorySuppliers.organizationId, organizationId),
      eq(inventorySuppliers.isActive, true)
    ),
    orderBy: (s) => [desc(s.name)],
  });
  const result = [];
  for (const s of suppliers) {
    const perf = await getSupplierPerformance(organizationId, s.id, s.name, s.rating);
    result.push({ ...s, performance: perf });
  }
  return result;
}

// ── Low stock & reorder suggestions ───────────────────────────────────────────

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  totalStock: number;
  reorderPoint: number;
  minStockLevel: number;
  suggestedReorderQty: number;
}

/** Products whose aggregate stock is at/below their reorder point. */
export async function getLowStockProducts(organizationId: string): Promise<LowStockProduct[]> {
  const products = await db.query.inventoryProducts.findMany({
    where: and(
      eq(inventoryProducts.organizationId, organizationId),
      eq(inventoryProducts.isActive, true)
    ),
  });
  const out: LowStockProduct[] = [];
  for (const p of products) {
    const [stockRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric),0)` })
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.organizationId, organizationId),
          eq(inventoryStock.productId, p.id)
        )
      );
    const totalStock = Number(stockRow?.total || 0);
    const reorderPoint = Number(p.reorderPoint || 0);
    const minStockLevel = Number(p.minStockLevel || 0);
    const below = totalStock <= reorderPoint || (minStockLevel > 0 && totalStock <= minStockLevel);
    if (below) {
      const suggested = Math.max(reorderPoint - totalStock, 0);
      out.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        totalStock,
        reorderPoint,
        minStockLevel,
        suggestedReorderQty: suggested > 0 ? suggested : Math.max(minStockLevel - totalStock, 1),
      });
    }
  }
  return out;
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export interface ProcurementDashboard {
  counts: Record<string, number>;
  pendingApprovals: number;
  totalCommitment: number;
  totalSpend: number;
  lowStockCount: number;
  openRecommendations: number;
  budgetUtilization: { allocated: number; spent: number; utilisationPct: number };
}

export async function getProcurementDashboard(organizationId: string): Promise<ProcurementDashboard> {
  const [
    requests,
    rfqs,
    quotations,
    pos,
    grns,
    invoices,
    payments,
    budgets,
    recommendations,
    approvals,
  ] = await Promise.all([
    statusCounts(procurementPurchaseRequests, organizationId),
    statusCounts(procurementRfqs, organizationId),
    statusCounts(procurementSupplierQuotations, organizationId),
    statusCounts(procurementPurchaseOrders, organizationId),
    statusCounts(procurementGrns, organizationId),
    statusCounts(procurementPurchaseInvoices, organizationId),
    statusCounts(procurementSupplierPayments, organizationId),
    db.select({ c: count() }).from(procurementBudgets).where(eq(procurementBudgets.organizationId, organizationId)),
    db
      .select({ c: count() })
      .from(procurementAiRecommendations)
      .where(
        and(
          eq(procurementAiRecommendations.organizationId, organizationId),
          eq(procurementAiRecommendations.status, "open")
        )
      ),
    db
      .select({ c: count() })
      .from(procurementApprovals)
      .where(
        and(
          eq(procurementApprovals.organizationId, organizationId),
          eq(procurementApprovals.status, "pending")
        )
      ),
  ]);

  const [commitmentRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementPurchaseOrders.total}::numeric),0)` })
    .from(procurementPurchaseOrders)
    .where(
      and(
        eq(procurementPurchaseOrders.organizationId, organizationId),
        sql`${procurementPurchaseOrders.status} IN ('approved','ordered','partially_received','received')`
      )
    );
  const [spendRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${procurementPurchaseInvoices.total}::numeric),0)` })
    .from(procurementPurchaseInvoices)
    .where(eq(procurementPurchaseInvoices.organizationId, organizationId));

  const [budgetAgg] = await db
    .select({
      allocated: sql<number>`COALESCE(SUM(${procurementBudgets.amount}::numeric),0)`,
      spent: sql<number>`COALESCE(SUM(${procurementBudgets.spent}::numeric),0)`,
    })
    .from(procurementBudgets)
    .where(eq(procurementBudgets.organizationId, organizationId));

  const allocated = Number(budgetAgg?.allocated || 0);
  const spent = Number(budgetAgg?.spent || 0);

  return {
    counts: {
      requests: sumCounts(requests),
      rfqs: sumCounts(rfqs),
      quotations: sumCounts(quotations),
      purchaseOrders: sumCounts(pos),
      grns: sumCounts(grns),
      invoices: sumCounts(invoices),
      payments: sumCounts(payments),
      budgets: Number(budgets[0]?.c || 0),
    },
    pendingApprovals: Number(approvals[0]?.c || 0),
    totalCommitment: Number(commitmentRow?.total || 0),
    totalSpend: Number(spendRow?.total || 0),
    lowStockCount: (await getLowStockProducts(organizationId)).length,
    openRecommendations: Number(recommendations[0]?.c || 0),
    budgetUtilization: {
      allocated,
      spent,
      utilisationPct: allocated ? Math.round((spent / allocated) * 100) : 0,
    },
  };
}

async function statusCounts(table: any, organizationId: string) {
  const rows = await db
    .select({ status: (table as any).status, c: count() })
    .from(table)
    .where(eq((table as any).organizationId, organizationId))
    .groupBy((table as any).status);
  return rows;
}

function sumCounts(rows: { status: string; c: number }[]): number {
  return rows.reduce((acc, r) => acc + Number(r.c), 0);
}

// ── Reports ─────────────────────────────────────────────────────────────────────

export interface ReportResult {
  spendBySupplier: { supplierId: string; name: string; total: number; invoiceCount: number }[];
  spendByCategory: { category: string | null; total: number }[];
  poStatusBreakdown: { status: string; count: number }[];
  budgetUtilization: { id: string; name: string; amount: number; spent: number; utilisationPct: number }[];
}

export async function getProcurementReports(organizationId: string): Promise<ReportResult> {
  const invoices = (await db.query.procurementPurchaseInvoices.findMany({
    where: eq(procurementPurchaseInvoices.organizationId, organizationId),
    with: { supplier: true },
  })) as any[];
  const supplierMap = new Map<string, { name: string; total: number; count: number }>();
  for (const inv of invoices) {
    const key = inv.supplierId;
    const entry = supplierMap.get(key) || { name: inv.supplier?.name ?? "Unknown", total: 0, count: 0 };
    entry.total += Number(inv.total);
    entry.count += 1;
    supplierMap.set(key, entry);
  }
  const spendBySupplier = Array.from(supplierMap.entries()).map(([supplierId, v]) => ({
    supplierId,
    name: v.name,
    total: Math.round(v.total * 100) / 100,
    invoiceCount: v.count,
  }));
  spendBySupplier.sort((a, b) => b.total - a.total);

  // Spend by product category (from invoice line items → product → category).
  const lines = (await db.query.procurementPurchaseInvoiceItems.findMany({
    where: eq(procurementPurchaseInvoiceItems.organizationId, organizationId),
    with: { product: { with: { category: true } } },
  })) as any[];
  const catMap = new Map<string | null, number>();
  for (const l of lines) {
    const cat = l.product?.category?.name ?? null;
    catMap.set(cat, (catMap.get(cat) || 0) + Number(l.lineTotal));
  }
  const spendByCategory = Array.from(catMap.entries()).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
  }));

  const poStatusRows = await db
    .select({ status: procurementPurchaseOrders.status, c: count() })
    .from(procurementPurchaseOrders)
    .where(eq(procurementPurchaseOrders.organizationId, organizationId))
    .groupBy(procurementPurchaseOrders.status);
  const poStatusBreakdown = poStatusRows.map((r) => ({ status: r.status, count: Number(r.c) }));

  const budgets = await db.query.procurementBudgets.findMany({
    where: eq(procurementBudgets.organizationId, organizationId),
  });
  const budgetUtilization = budgets.map((b) => {
    const amount = Number(b.amount);
    const spent = Number(b.spent);
    return {
      id: b.id,
      name: b.name,
      amount,
      spent,
      utilisationPct: amount ? Math.round((spent / amount) * 100) : 0,
    };
  });

  return { spendBySupplier, spendByCategory, poStatusBreakdown, budgetUtilization };
}
