/**
 * KaziFlow — Enterprise Analytics metrics service layer
 * ------------------------------------------------------------------
 * Read-side analytics aggregations for the Enterprise Analytics module.
 * Every query is organization-scoped (multi-tenant) and most aggregates use
 * COALESCE so an empty result set yields 0 instead of NULL. All functions are
 * async and accept an optional [startDate, endDate] window that defaults to the
 * current calendar year (Jan 1 → now).
 */
import { db } from "@/db";
import {
  posOrders,
  posOrderItems,
  payments,
  invoices,
  expenses,
  inventoryProducts,
  inventoryStock,
  inventoryStockMovements,
  inventoryCategories,
  hrEmployees,
  hrDepartments,
  hrAttendanceRecords,
  payslips,
  procurementPurchaseInvoices,
  procurementPurchaseOrders,
  crmLeads,
  crmDeals,
  complianceAlerts,
  clients,
  analyticsInsights,
  enterpriseBranches,
  branchPerformanceSnapshots,
} from "@/db/schema";
import {
  and,
  eq,
  gte,
  lte,
  desc,
  sql,
  count,
} from "drizzle-orm";

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

/** Resolve the reporting window, defaulting to Jan 1 → now of the current year. */
function resolveRange(startDate?: Date, endDate?: Date): DateRange {
  const now = new Date();
  const start =
    startDate ?? new Date(now.getFullYear(), 0, 1);
  const end = endDate ?? now;
  return { start, end };
}

/** Build a date-scoped WHERE clause fragment for a timestamp column. */
function dateScope(
  column:
    | typeof posOrders.createdAt
    | typeof payments.createdAt
    | typeof invoices.createdAt
    | typeof expenses.date
    | typeof inventoryStockMovements.createdAt
    | typeof payslips.createdAt
    | typeof procurementPurchaseInvoices.createdAt
    | typeof procurementPurchaseOrders.createdAt
    | typeof crmLeads.createdAt
    | typeof complianceAlerts.createdAt
    | typeof analyticsInsights.createdAt,
  range: DateRange
) {
  return and(gte(column, range.start), lte(column, range.end));
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutiveSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  activeEmployees: number;
  inventoryValue: number;
  topProduct: { name: string; revenue: number } | null;
  topClient: { name: string; revenue: number } | null;
  currency: string;
  period: { start: string; end: string };
}

export interface SalesAnalytics {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  byMonth: { month: string; sales: number; orders: number }[];
}

export interface RevenueAnalytics {
  totalRevenue: number;
  paymentCount: number;
  byMonth: { month: string; revenue: number }[];
  byMethod: { method: string; revenue: number }[];
}

export interface ProfitLossAnalytics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
  byMonth: { month: string; revenue: number; expenses: number; profit: number }[];
}

export interface CashFlowAnalytics {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  byMonth: { month: string; inflow: number; outflow: number; net: number }[];
}

export interface InventoryAnalytics {
  productCount: number;
  categoryCount: number;
  stockValue: number;
  lowStockCount: number;
  movementsByType: { type: string; quantity: number }[];
  byMonth: { month: string; movements: number; quantity: number }[];
}

export interface CrmAnalytics {
  leadCount: number;
  convertedLeads: number;
  conversionRate: number;
  dealCount: number;
  openPipelineValue: number;
  wonValue: number;
  byStatus: { status: string; count: number }[];
}

export interface ProcurementAnalytics {
  totalPurchaseValue: number;
  purchaseInvoiceCount: number;
  purchaseOrderCount: number;
  byMonth: { month: string; value: number }[];
}

export interface HrAnalytics {
  employeeCount: number;
  activeEmployees: number;
  departmentCount: number;
  departments: { name: string; headcount: number }[];
  attendanceRate: number;
}

export interface PayrollAnalytics {
  totalNetPay: number;
  payslipCount: number;
  averageNetPay: number;
  byMonth: { month: string; netPay: number; count: number }[];
}

export interface ComplianceAnalytics {
  totalAlerts: number;
  resolvedAlerts: number;
  pendingAlerts: number;
  bySeverity: { severity: string; count: number }[];
}

export interface BranchPerformance {
  branches: {
    id: string;
    name: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
}

export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  change?: number;
  target?: number;
  trend?: "up" | "down" | "flat";
}

export interface CustomReportData {
  title: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface WidgetData {
  id: string;
  title: string;
  value: number;
  type: string;
  series: { label: string; value: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getExecutiveSummary(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ExecutiveSummary> {
  const range = resolveRange(startDate, endDate);

  const [revenueRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    );

  const [expenseRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)`,
    })
    .from(expenses)
    .where(
      and(eq(expenses.organizationId, organizationId), dateScope(expenses.date, range))
    );

  const [invoiceRow] = await db
    .select({
      outstanding: sql<number>`COALESCE(SUM(${invoices.total}::numeric),0) FILTER (WHERE ${invoices.status} NOT IN ('paid','cancelled'))`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        dateScope(invoices.createdAt, range)
      )
    );

  const [employeeRow] = await db
    .select({ count: count() })
    .from(hrEmployees)
    .where(
      and(
        eq(hrEmployees.organizationId, organizationId),
        eq(hrEmployees.status, "active")
      )
    );

  const [stockRow] = await db
    .select({
      value: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric * COALESCE(${inventoryProducts.costPrice}::numeric,0)),0)`,
    })
    .from(inventoryStock)
    .leftJoin(
      inventoryProducts,
      eq(inventoryStock.productId, inventoryProducts.id)
    )
    .where(eq(inventoryStock.organizationId, organizationId));

  const [topProduct] = await db
    .select({
      name: posOrderItems.description,
      revenue: sql<number>`COALESCE(SUM(${posOrderItems.lineTotal}::numeric),0)`,
    })
    .from(posOrderItems)
    .innerJoin(posOrders, eq(posOrderItems.orderId, posOrders.id))
    .where(
      and(
        eq(posOrderItems.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        dateScope(posOrders.createdAt, range)
      )
    )
    .groupBy(posOrderItems.description)
    .orderBy(sql`SUM(${posOrderItems.lineTotal}::numeric) DESC`)
    .limit(1);

  const [topClient] = await db
    .select({
      name: clients.name,
      revenue: sql<number>`COALESCE(SUM(${invoices.total}::numeric),0)`,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "paid"),
        dateScope(invoices.createdAt, range)
      )
    )
    .groupBy(clients.name)
    .orderBy(sql`SUM(${invoices.total}::numeric) DESC`)
    .limit(1);

  const totalRevenue = toNum(revenueRow?.total);
  const totalExpenses = toNum(expenseRow?.total);
  const inventoryValue = toNum(stockRow?.value);

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    outstandingInvoices: toNum(invoiceRow?.outstanding),
    activeEmployees: toNum(employeeRow?.count),
    inventoryValue,
    topProduct: topProduct
      ? { name: topProduct.name, revenue: toNum(topProduct.revenue) }
      : null,
    topClient: topClient
      ? { name: topClient.name ?? "Unknown", revenue: toNum(topClient.revenue) }
      : null,
    currency: "KES",
    period: { start: range.start.toISOString(), end: range.end.toISOString() },
  };
}

export async function getSalesAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SalesAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [summary] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${posOrders.total}::numeric),0)`,
      orders: count(),
      average: sql<number>`COALESCE(AVG(${posOrders.total}::numeric),0)`,
    })
    .from(posOrders)
    .where(
      and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        dateScope(posOrders.createdAt, range)
      )
    );

  const byMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${posOrders.createdAt}, 'YYYY-MM')`,
      sales: sql<number>`COALESCE(SUM(${posOrders.total}::numeric),0)`,
      orders: count(),
    })
    .from(posOrders)
    .where(
      and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        dateScope(posOrders.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${posOrders.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${posOrders.createdAt}, 'YYYY-MM')`);

  return {
    totalSales: toNum(summary?.total),
    orderCount: toNum(summary?.orders),
    averageOrderValue: toNum(summary?.average),
    byMonth: byMonthRows.map((r) => ({
      month: r.month,
      sales: toNum(r.sales),
      orders: toNum(r.orders),
    })),
  };
}

export async function getRevenueAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<RevenueAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [summary] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
      count: count(),
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    );

  const byMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);

  const byMethodRows = await db
    .select({
      method: payments.method,
      revenue: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    )
    .groupBy(payments.method)
    .orderBy(sql`SUM(${payments.amount}::numeric) DESC`);

  return {
    totalRevenue: toNum(summary?.total),
    paymentCount: toNum(summary?.count),
    byMonth: byMonthRows.map((r) => ({
      month: r.month,
      revenue: toNum(r.revenue),
    })),
    byMethod: byMethodRows.map((r) => ({
      method: String(r.method),
      revenue: toNum(r.revenue),
    })),
  };
}

export async function getProfitLossAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ProfitLossAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [revenueRow] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    );

  const [expenseRow] = await db
    .select({
      expenses: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)`,
    })
    .from(expenses)
    .where(
      and(eq(expenses.organizationId, organizationId), dateScope(expenses.date, range))
    );

  const revenueByMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);

  const expenseByMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${expenses.date}, 'YYYY-MM')`,
      expenses: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)`,
    })
    .from(expenses)
    .where(
      and(eq(expenses.organizationId, organizationId), dateScope(expenses.date, range))
    )
    .groupBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM')`);

  const expenseMap = new Map<string, number>(
    expenseByMonthRows.map((r) => [r.month, toNum(r.expenses)])
  );

  const byMonth = revenueByMonthRows.map((r) => {
    const revenue = toNum(r.revenue);
    const expenses = expenseMap.get(r.month) ?? 0;
    return {
      month: r.month,
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  });

  const totalRevenue =
    byMonth.reduce((a, b) => a + b.revenue, 0) || toNum(revenueRow?.revenue);
  const totalExpenses =
    byMonth.reduce((a, b) => a + b.expenses, 0) || toNum(expenseRow?.expenses);
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    byMonth,
  };
}

export async function getCashFlowAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CashFlowAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [inflowRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    );

  const [outflowRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)`,
    })
    .from(expenses)
    .where(
      and(eq(expenses.organizationId, organizationId), dateScope(expenses.date, range))
    );

  const inflowRows = await db
    .select({
      month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
      inflow: sql<number>`COALESCE(SUM(${payments.amount}::numeric),0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.status, "completed"),
        dateScope(payments.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);

  const outflowRows = await db
    .select({
      month: sql<string>`TO_CHAR(${expenses.date}, 'YYYY-MM')`,
      outflow: sql<number>`COALESCE(SUM(${expenses.amount}::numeric),0)`,
    })
    .from(expenses)
    .where(
      and(eq(expenses.organizationId, organizationId), dateScope(expenses.date, range))
    )
    .groupBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM')`);

  const outflowMap = new Map<string, number>(
    outflowRows.map((r) => [r.month, toNum(r.outflow)])
  );
  const months = Array.from(
    new Set([...inflowRows.map((r) => r.month), ...outflowRows.map((r) => r.month)])
  ).sort();

  const byMonth = months.map((month) => {
    const inflow = toNum(inflowRows.find((r) => r.month === month)?.inflow);
    const outflow = outflowMap.get(month) ?? 0;
    return { month, inflow, outflow, net: inflow - outflow };
  });

  const totalInflow = toNum(inflowRow?.total);
  const totalOutflow = toNum(outflowRow?.total);

  return {
    totalInflow,
    totalOutflow,
    netCashFlow: totalInflow - totalOutflow,
    byMonth,
  };
}

export async function getInventoryAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<InventoryAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [productRow] = await db
    .select({ count: count() })
    .from(inventoryProducts)
    .where(eq(inventoryProducts.organizationId, organizationId));

  const [categoryRow] = await db
    .select({ count: count() })
    .from(inventoryCategories)
    .where(eq(inventoryCategories.organizationId, organizationId));

  const [stockRow] = await db
    .select({
      value: sql<number>`COALESCE(SUM(${inventoryStock.quantity}::numeric * COALESCE(${inventoryProducts.costPrice}::numeric,0)),0)`,
      low: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryStock.quantity}::numeric <= COALESCE(${inventoryProducts.minStockLevel},0) THEN 1 ELSE 0 END),0)`,
    })
    .from(inventoryStock)
    .leftJoin(
      inventoryProducts,
      eq(inventoryStock.productId, inventoryProducts.id)
    )
    .where(eq(inventoryStock.organizationId, organizationId));

  const movementsByTypeRows = await db
    .select({
      type: inventoryStockMovements.type,
      quantity: sql<number>`COALESCE(SUM(${inventoryStockMovements.quantity}::numeric),0)`,
    })
    .from(inventoryStockMovements)
    .where(
      and(
        eq(inventoryStockMovements.organizationId, organizationId),
        dateScope(inventoryStockMovements.createdAt, range)
      )
    )
    .groupBy(inventoryStockMovements.type);

  const byMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${inventoryStockMovements.createdAt}, 'YYYY-MM')`,
      movements: count(),
      quantity: sql<number>`COALESCE(SUM(${inventoryStockMovements.quantity}::numeric),0)`,
    })
    .from(inventoryStockMovements)
    .where(
      and(
        eq(inventoryStockMovements.organizationId, organizationId),
        dateScope(inventoryStockMovements.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${inventoryStockMovements.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${inventoryStockMovements.createdAt}, 'YYYY-MM')`);

  return {
    productCount: toNum(productRow?.count),
    categoryCount: toNum(categoryRow?.count),
    stockValue: toNum(stockRow?.value),
    lowStockCount: toNum(stockRow?.low),
    movementsByType: movementsByTypeRows.map((r) => ({
      type: String(r.type),
      quantity: toNum(r.quantity),
    })),
    byMonth: byMonthRows.map((r) => ({
      month: r.month,
      movements: toNum(r.movements),
      quantity: toNum(r.quantity),
    })),
  };
}

export async function getCrmAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CrmAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [leadRow] = await db
    .select({
      count: count(),
      converted: sql<number>`COALESCE(SUM(CASE WHEN ${crmLeads.convertedAt} IS NOT NULL THEN 1 ELSE 0 END),0)`,
    })
    .from(crmLeads)
    .where(
      and(
        eq(crmLeads.organizationId, organizationId),
        dateScope(crmLeads.createdAt, range)
      )
    );

  const [dealRow] = await db
    .select({
      count: count(),
      won: sql<number>`COALESCE(SUM(${crmDeals.amount}::numeric) FILTER (WHERE ${crmDeals.status} = 'won'),0)`,
      open: sql<number>`COALESCE(SUM(${crmDeals.amount}::numeric) FILTER (WHERE ${crmDeals.status} = 'open'),0)`,
    })
    .from(crmDeals)
    .where(eq(crmDeals.organizationId, organizationId));

  const byStatusRows = await db
    .select({
      status: crmDeals.status,
      count: count(),
    })
    .from(crmDeals)
    .where(eq(crmDeals.organizationId, organizationId))
    .groupBy(crmDeals.status);

  const leadCount = toNum(leadRow?.count);
  const convertedLeads = toNum(leadRow?.converted);

  return {
    leadCount,
    convertedLeads,
    conversionRate: leadCount > 0 ? (convertedLeads / leadCount) * 100 : 0,
    dealCount: toNum(dealRow?.count),
    openPipelineValue: toNum(dealRow?.open),
    wonValue: toNum(dealRow?.won),
    byStatus: byStatusRows.map((r) => ({
      status: String(r.status),
      count: toNum(r.count),
    })),
  };
}

export async function getProcurementAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ProcurementAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [invoiceRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${procurementPurchaseInvoices.total}::numeric),0)`,
      count: count(),
    })
    .from(procurementPurchaseInvoices)
    .where(
      and(
        eq(procurementPurchaseInvoices.organizationId, organizationId),
        dateScope(procurementPurchaseInvoices.createdAt, range)
      )
    );

  const [orderRow] = await db
    .select({ count: count() })
    .from(procurementPurchaseOrders)
    .where(
      and(
        eq(procurementPurchaseOrders.organizationId, organizationId),
        dateScope(procurementPurchaseOrders.createdAt, range)
      )
    );

  const byMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${procurementPurchaseInvoices.createdAt}, 'YYYY-MM')`,
      value: sql<number>`COALESCE(SUM(${procurementPurchaseInvoices.total}::numeric),0)`,
    })
    .from(procurementPurchaseInvoices)
    .where(
      and(
        eq(procurementPurchaseInvoices.organizationId, organizationId),
        dateScope(procurementPurchaseInvoices.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${procurementPurchaseInvoices.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${procurementPurchaseInvoices.createdAt}, 'YYYY-MM')`);

  return {
    totalPurchaseValue: toNum(invoiceRow?.total),
    purchaseInvoiceCount: toNum(invoiceRow?.count),
    purchaseOrderCount: toNum(orderRow?.count),
    byMonth: byMonthRows.map((r) => ({
      month: r.month,
      value: toNum(r.value),
    })),
  };
}

export async function getHrAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<HrAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [employeeRow] = await db
    .select({
      count: count(),
      active: sql<number>`COALESCE(SUM(CASE WHEN ${hrEmployees.status} = 'active' THEN 1 ELSE 0 END),0)`,
    })
    .from(hrEmployees)
    .where(eq(hrEmployees.organizationId, organizationId));

  const [departmentRow] = await db
    .select({ count: count() })
    .from(hrDepartments)
    .where(eq(hrDepartments.organizationId, organizationId));

  const departmentsRows = await db
    .select({
      name: hrDepartments.name,
      headcount: count(),
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .where(eq(hrEmployees.organizationId, organizationId))
    .groupBy(hrDepartments.name);

  const [attendanceRow] = await db
    .select({
      total: count(),
      present: sql<number>`COALESCE(SUM(CASE WHEN ${hrAttendanceRecords.status} = 'present' THEN 1 ELSE 0 END),0)`,
    })
    .from(hrAttendanceRecords)
    .where(
      and(
        eq(hrAttendanceRecords.organizationId, organizationId),
        dateScope(hrAttendanceRecords.date, range)
      )
    );

  const totalAttendance = toNum(attendanceRow?.total);
  const presentAttendance = toNum(attendanceRow?.present);

  return {
    employeeCount: toNum(employeeRow?.count),
    activeEmployees: toNum(employeeRow?.active),
    departmentCount: toNum(departmentRow?.count),
    departments: departmentsRows.map((r) => ({
      name: r.name ?? "Unassigned",
      headcount: toNum(r.headcount),
    })),
    attendanceRate:
      totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0,
  };
}

export async function getPayrollAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PayrollAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [summary] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payslips.netPay}::numeric),0)`,
      count: count(),
      average: sql<number>`COALESCE(AVG(${payslips.netPay}::numeric),0)`,
    })
    .from(payslips)
    .where(
      and(
        eq(payslips.organizationId, organizationId),
        dateScope(payslips.createdAt, range)
      )
    );

  const byMonthRows = await db
    .select({
      month: sql<string>`TO_CHAR(${payslips.createdAt}, 'YYYY-MM')`,
      netPay: sql<number>`COALESCE(SUM(${payslips.netPay}::numeric),0)`,
      count: count(),
    })
    .from(payslips)
    .where(
      and(
        eq(payslips.organizationId, organizationId),
        dateScope(payslips.createdAt, range)
      )
    )
    .groupBy(sql`TO_CHAR(${payslips.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${payslips.createdAt}, 'YYYY-MM')`);

  return {
    totalNetPay: toNum(summary?.total),
    payslipCount: toNum(summary?.count),
    averageNetPay: toNum(summary?.average),
    byMonth: byMonthRows.map((r) => ({
      month: r.month,
      netPay: toNum(r.netPay),
      count: toNum(r.count),
    })),
  };
}

export async function getComplianceAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ComplianceAnalytics> {
  const range = resolveRange(startDate, endDate);

  const [summary] = await db
    .select({
      total: count(),
      resolved: sql<number>`COALESCE(SUM(CASE WHEN ${complianceAlerts.resolved} = true THEN 1 ELSE 0 END),0)`,
    })
    .from(complianceAlerts)
    .where(
      and(
        eq(complianceAlerts.organizationId, organizationId),
        dateScope(complianceAlerts.createdAt, range)
      )
    );

  const bySeverityRows = await db
    .select({
      severity: complianceAlerts.severity,
      count: count(),
    })
    .from(complianceAlerts)
    .where(
      and(
        eq(complianceAlerts.organizationId, organizationId),
        dateScope(complianceAlerts.createdAt, range)
      )
    )
    .groupBy(complianceAlerts.severity);

  const total = toNum(summary?.total);
  const resolved = toNum(summary?.resolved);

  return {
    totalAlerts: total,
    resolvedAlerts: resolved,
    pendingAlerts: total - resolved,
    bySeverity: bySeverityRows.map((r) => ({
      severity: String(r.severity),
      count: toNum(r.count),
    })),
  };
}

export async function getBranchPerformance(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<BranchPerformance> {
  // Pull each branch plus its latest performance snapshot, then enrich with a
  // relative benchmark (share of total org revenue) for comparison.
  const branches = await db.query.enterpriseBranches.findMany({
    where: eq(enterpriseBranches.organizationId, organizationId),
    with: {
      performanceSnapshots: {
        orderBy: (t: any) => [desc(t.periodEnd)],
        limit: 1,
      },
    },
  });

  const enriched = branches.map((b) => {
    const snap = b.performanceSnapshots?.[0];
    return {
      id: b.id,
      name: b.name,
      revenue: toNum(snap?.revenue),
      expenses: toNum(snap?.expenses),
      profit: toNum(snap?.profit),
      inventoryValue: toNum(snap?.inventoryValue),
      salesCount: toNum(snap?.salesCount),
      employeeCount: toNum(snap?.employeeCount),
      periodEnd: snap?.periodEnd ?? null,
    };
  });

  const totalRevenue = enriched.reduce((s, b) => s + b.revenue, 0) || 1;
  for (const b of enriched) {
    (b as any).revenueShare = Math.round((b.revenue / totalRevenue) * 100);
  }

  return { branches: enriched };
}

export async function getAiInsights(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  {
    id: string;
    type: string;
    title: string;
    description: string | null;
    severity: string;
    confidence: number;
    createdAt: string;
  }[]
> {
  const range = resolveRange(startDate, endDate);

  const rows = await db
    .select({
      id: analyticsInsights.id,
      type: analyticsInsights.type,
      title: analyticsInsights.title,
      description: analyticsInsights.description,
      severity: analyticsInsights.severity,
      confidence: analyticsInsights.confidence,
      createdAt: analyticsInsights.createdAt,
    })
    .from(analyticsInsights)
    .where(
      and(
        eq(analyticsInsights.organizationId, organizationId),
        dateScope(analyticsInsights.createdAt, range)
      )
    )
    .orderBy(sql`${analyticsInsights.createdAt} DESC`)
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    type: String(r.type),
    title: r.title,
    description: r.description ?? null,
    severity: String(r.severity),
    confidence: toNum(r.confidence),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getKpiMetrics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<KpiMetric[]> {
  const [summary, hr, inventory] = await Promise.all([
    getExecutiveSummary(organizationId, startDate, endDate),
    getHrAnalytics(organizationId, startDate, endDate),
    getInventoryAnalytics(organizationId, startDate, endDate),
  ]);

  return [
    {
      id: "revenue",
      label: "Total Revenue",
      value: summary.totalRevenue,
      unit: "KES",
      trend: "up",
    },
    {
      id: "expenses",
      label: "Total Expenses",
      value: summary.totalExpenses,
      unit: "KES",
      trend: "down",
    },
    {
      id: "net_profit",
      label: "Net Profit",
      value: summary.netProfit,
      unit: "KES",
      trend: summary.netProfit >= 0 ? "up" : "down",
    },
    {
      id: "outstanding",
      label: "Outstanding Invoices",
      value: summary.outstandingInvoices,
      unit: "KES",
      trend: "flat",
    },
    {
      id: "active_employees",
      label: "Active Employees",
      value: hr.activeEmployees,
      unit: "count",
    },
    {
      id: "inventory_value",
      label: "Inventory Value",
      value: inventory.stockValue,
      unit: "KES",
    },
    {
      id: "attendance",
      label: "Attendance Rate",
      value: Number(hr.attendanceRate.toFixed(2)),
      unit: "percent",
    },
  ];
}

export async function getCustomReport(
  organizationId: string,
  config: {
    title: string;
    columns: string[];
    rows?: Record<string, unknown>[];
  }
): Promise<CustomReportData> {
  return {
    title: config.title ?? "Custom Report",
    columns: config.columns ?? [],
    rows: config.rows ?? [],
  };
}

export async function getWidgetData(
  organizationId: string,
  widgetId: string,
  period: string = "current_year"
): Promise<WidgetData> {
  return {
    id: widgetId,
    title: widgetId
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    value: 0,
    type: "metric",
    series: [],
  };
}
