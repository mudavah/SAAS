/**
 * KaziFlow — Enterprise Reports service
 * ------------------------------------------------------------------
 * Read-side consolidated reporting across branches. Every aggregate is scoped
 * by organizationId. Branch-scoped metrics lean on branchPerformanceSnapshots
 * (computed by the analytics job) plus live payments/expenses/transfers/sales.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchPerformanceSnapshots,
  payments,
  expenses,
  inventoryStock,
  inventoryProducts,
  interBranchTransfers,
  interBranchSales,
} from "@/db/schema";
import { and, desc, eq, gte, lte, sql, count, inArray } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission } from "./core";

/** Coerce any DB numeric/string value into a JS number (defaults to 0). */
function toNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface DateRange {
  start: Date;
  end: Date;
}

function resolveRange(startDate?: Date, endDate?: Date): DateRange {
  const now = new Date();
  return {
    start: startDate ?? new Date(now.getFullYear(), 0, 1),
    end: endDate ?? now,
  };
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface BranchPerformanceRow {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  isDefault: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  revenue: number;
  expenses: number;
  profit: number;
  inventoryValue: number;
  salesCount: number;
  transferCount: number;
  employeeCount: number;
}

export interface BranchPerformanceReport {
  branches: BranchPerformanceRow[];
}

export interface ConsolidatedReport {
  organizationId: string;
  period: { start: string; end: string };
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  inventoryValue: number;
  branchCount: number;
  activeTransfers: number;
  pendingSales: number;
}

export interface CrossBranchInventoryRow {
  productId: string;
  quantity: number;
  avgCost: number;
  value: number;
}

export interface CrossBranchInventoryReport {
  organizationId: string;
  totalValue: number;
  products: CrossBranchInventoryRow[];
  inTransitTransfers: number;
  inTransitValue: number;
}

export interface EnterpriseOverview {
  organizationId: string;
  branchCount: number;
  activeBranchCount: number;
  defaultBranchName: string | null;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  inventoryValue: number;
  openTransfers: number;
  completedTransfers: number;
  openSales: number;
  completedSales: number;
  generatedAt: string;
}

// ── Functions ────────────────────────────────────────────────────────────────

export async function getBranchPerformance(
  ctx: ServerContext,
  startDate?: Date,
  endDate?: Date
): Promise<BranchPerformanceReport> {
  requirePermission(ctx, "enterprise.reports.view");
  const range = resolveRange(startDate, endDate);

  const branches = await db.query.enterpriseBranches.findMany({
    where: eq(enterpriseBranches.organizationId, ctx.organizationId),
    with: {
      performanceSnapshots: {
        orderBy: [desc(branchPerformanceSnapshots.periodEnd)],
        limit: 1,
      },
    },
  });

  const branches_ = branches.map((b) => {
    const snap = (b.performanceSnapshots as any[])[0];
    return {
      id: b.id,
      name: b.name,
      code: b.code,
      type: b.type,
      status: b.status,
      isDefault: b.isDefault,
      periodStart: snap?.periodStart ? snap.periodStart.toISOString() : null,
      periodEnd: snap?.periodEnd ? snap.periodEnd.toISOString() : null,
      revenue: toNum(snap?.revenue),
      expenses: toNum(snap?.expenses),
      profit: toNum(snap?.profit),
      inventoryValue: toNum(snap?.inventoryValue),
      salesCount: toNum(snap?.salesCount),
      transferCount: toNum(snap?.transferCount),
      employeeCount: toNum(snap?.employeeCount),
    } satisfies BranchPerformanceRow;
  });

  return { branches: branches_ };
}

export async function getConsolidatedReport(
  ctx: ServerContext,
  startDate?: Date,
  endDate?: Date
): Promise<ConsolidatedReport> {
  requirePermission(ctx, "enterprise.reports.view");
  const range = resolveRange(startDate, endDate);

  const [revRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, ctx.organizationId),
        eq(payments.status, "completed"),
        gte(payments.createdAt, range.start),
        lte(payments.createdAt, range.end)
      )
    );

  const [expRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)` })
    .from(expenses)
    .where(
      and(
        eq(expenses.organizationId, ctx.organizationId),
        gte(expenses.date, range.start),
        lte(expenses.date, range.end)
      )
    );

  const [stockRow] = await db
    .select({
      value: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric * COALESCE(${inventoryProducts.costPrice}::numeric,0)),0)`,
    })
    .from(inventoryStock)
    .leftJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
    .where(eq(inventoryStock.organizationId, ctx.organizationId));

  const [branchRow] = await db
    .select({ count: count() })
    .from(enterpriseBranches)
    .where(eq(enterpriseBranches.organizationId, ctx.organizationId));

  const [activeTransfersRow] = await db
    .select({ count: count() })
    .from(interBranchTransfers)
    .where(
      and(
        eq(interBranchTransfers.organizationId, ctx.organizationId),
        inArray(interBranchTransfers.status, ["pending", "in_transit", "received"])
      )
    );

  const [pendingSalesRow] = await db
    .select({ count: count() })
    .from(interBranchSales)
    .where(
      and(
        eq(interBranchSales.organizationId, ctx.organizationId),
        inArray(interBranchSales.status, ["pending", "approved"])
      )
    );

  const totalRevenue = toNum(revRow?.total);
  const totalExpenses = toNum(expRow?.total);

  return {
    organizationId: ctx.organizationId,
    period: { start: range.start.toISOString(), end: range.end.toISOString() },
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    inventoryValue: toNum(stockRow?.value),
    branchCount: toNum(branchRow?.count),
    activeTransfers: toNum(activeTransfersRow?.count),
    pendingSales: toNum(pendingSalesRow?.count),
  };
}

export async function getCrossBranchInventory(
  ctx: ServerContext
): Promise<CrossBranchInventoryReport> {
  requirePermission(ctx, "enterprise.reports.view");

  const rows = await db
    .select({
      productId: inventoryStock.productId,
      quantity: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric),0)`,
      avgCost: sql<number>`COALESCE(AVG(COALESCE(${inventoryStock.avgCost}::numeric,0)),0)`,
      value: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric * COALESCE(${inventoryProducts.costPrice}::numeric,0)),0)`,
    })
    .from(inventoryStock)
    .leftJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
    .where(eq(inventoryStock.organizationId, ctx.organizationId))
    .groupBy(inventoryStock.productId);

  const totalValue = rows.reduce((sum, r) => sum + toNum(r.value), 0);

  const [inTransitRow] = await db
    .select({
      count: count(),
      value: sql<number>`COALESCE(SUM(${interBranchTransfers.status}::numeric),0)`,
    })
    .from(interBranchTransfers)
    .where(
      and(
        eq(interBranchTransfers.organizationId, ctx.organizationId),
        eq(interBranchTransfers.status, "in_transit")
      )
    );

  return {
    organizationId: ctx.organizationId,
    totalValue,
    products: rows.map((r) => ({
      productId: r.productId,
      quantity: toNum(r.quantity),
      avgCost: toNum(r.avgCost),
      value: toNum(r.value),
    })),
    inTransitTransfers: toNum(inTransitRow?.count),
    inTransitValue: 0,
  };
}

export async function getEnterpriseOverview(
  ctx: ServerContext
): Promise<EnterpriseOverview> {
  requirePermission(ctx, "enterprise.reports.view");

  const [branchAgg] = await db
    .select({
      count: count(),
      active: sql<number>`COALESCE(SUM(CASE WHEN ${enterpriseBranches.status} = 'active' THEN 1 ELSE 0 END),0)`,
      defaultName: sql<string>`MAX(CASE WHEN ${enterpriseBranches.isDefault} = true THEN ${enterpriseBranches.name} END)`,
    })
    .from(enterpriseBranches)
    .where(eq(enterpriseBranches.organizationId, ctx.organizationId));

  const [revRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, ctx.organizationId),
        eq(payments.status, "completed")
      )
    );

  const [expRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)` })
    .from(expenses)
    .where(eq(expenses.organizationId, ctx.organizationId));

  const [stockRow] = await db
    .select({
      value: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric * COALESCE(${inventoryProducts.costPrice}::numeric,0)),0)`,
    })
    .from(inventoryStock)
    .leftJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
    .where(eq(inventoryStock.organizationId, ctx.organizationId));

  const [openTransfersRow] = await db
    .select({ count: count() })
    .from(interBranchTransfers)
    .where(
      and(
        eq(interBranchTransfers.organizationId, ctx.organizationId),
        inArray(interBranchTransfers.status, ["pending", "in_transit", "received"])
      )
    );

  const [completedTransfersRow] = await db
    .select({ count: count() })
    .from(interBranchTransfers)
    .where(
      and(
        eq(interBranchTransfers.organizationId, ctx.organizationId),
        eq(interBranchTransfers.status, "completed")
      )
    );

  const [openSalesRow] = await db
    .select({ count: count() })
    .from(interBranchSales)
    .where(
      and(
        eq(interBranchSales.organizationId, ctx.organizationId),
        inArray(interBranchSales.status, ["pending", "approved"])
      )
    );

  const [completedSalesRow] = await db
    .select({ count: count() })
    .from(interBranchSales)
    .where(
      and(
        eq(interBranchSales.organizationId, ctx.organizationId),
        eq(interBranchSales.status, "completed")
      )
    );

  const totalRevenue = toNum(revRow?.total);
  const totalExpenses = toNum(expRow?.total);

  return {
    organizationId: ctx.organizationId,
    branchCount: toNum(branchAgg?.count),
    activeBranchCount: toNum(branchAgg?.active),
    defaultBranchName: (branchAgg as any)?.defaultName ?? null,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    inventoryValue: toNum(stockRow?.value),
    openTransfers: toNum(openTransfersRow?.count),
    completedTransfers: toNum(completedTransfersRow?.count),
    openSales: toNum(openSalesRow?.count),
    completedSales: toNum(completedSalesRow?.count),
    generatedAt: new Date().toISOString(),
  };
}
