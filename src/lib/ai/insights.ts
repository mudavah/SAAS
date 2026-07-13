/**
 * KaziFlow — AI insights generator
 * ------------------------------------------------------------------
 * Produces prioritized, organization-scoped business insights from raw DB
 * metrics. Designed to be cheap in production: no LLM call required for the
 * baseline set (rules-based). An optional LLM enhancement can layer on top.
 */
import { db } from "@/db";
import {
  invoices,
  payments,
  expenses,
  inventoryProducts,
  inventoryStock,
  complianceAlerts,
  aiInsights,
} from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getCurrentMonth } from "@/lib/utils";

export type InsightPriority = "normal" | "high" | "urgent";

export interface Insight {
  type: string;
  title: string;
  description: string;
  priority: InsightPriority;
  data: Record<string, unknown>;
}

function toNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchBusinessMetrics(organizationId: string): Promise<BusinessMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = getCurrentMonth();

  const [
    overdueRes,
    lowStockRes,
    expenseTotalRes,
    revenueRes,
    alertRes,
    invoiceCountRes,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${invoices.total}),0)` })
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "overdue")
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(inventoryStock)
      .innerJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
      .where(and(
        eq(inventoryProducts.organizationId, organizationId),
        sql`coalesce(${inventoryStock.quantity},0) <= ${inventoryProducts.reorderPoint}`
      )),

    db.select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` })
      .from(expenses)
      .where(and(
        eq(expenses.organizationId, organizationId),
        sql`${expenses.createdAt} >= ${monthStart.toISOString()}`
      )),

    db.select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` })
      .from(payments)
      .where(and(
        eq(payments.organizationId, organizationId),
        sql`${payments.createdAt} >= ${monthStart.toISOString()}`
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(complianceAlerts)
      .where(and(
        eq(complianceAlerts.organizationId, organizationId),
        eq(complianceAlerts.resolved, false),
        eq(complianceAlerts.severity, "critical")
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.createdAt} >= ${monthStart.toISOString()}`
      )),
  ]);

  return {
    overdueInvoices: toNum(overdueRes[0]?.count),
    overdueAmount: toNum(overdueRes[0]?.total),
    lowStockCount: toNum(lowStockRes[0]?.count),
    monthlyExpenses: toNum(expenseTotalRes[0]?.total),
    monthlyRevenue: toNum(revenueRes[0]?.total),
    highSeverityAlerts: toNum(alertRes[0]?.count),
    invoicesThisMonth: toNum(invoiceCountRes[0]?.count),
  };
}

export interface BusinessMetrics {
  overdueInvoices: number;
  overdueAmount: number;
  lowStockCount: number;
  monthlyExpenses: number;
  monthlyRevenue: number;
  highSeverityAlerts: number;
  invoicesThisMonth: number;
}

export function generateInsights(metrics: BusinessMetrics): Insight[] {
  const insights: Insight[] = [];

  if (metrics.overdueInvoices > 0) {
    const priority: InsightPriority = metrics.overdueInvoices > 5 ? "urgent" : "high";
    insights.push({
      type: "receivables",
      title: `${metrics.overdueInvoices} overdue invoice${metrics.overdueInvoices > 1 ? "s" : ""}`,
      description: `You have KES ${metrics.overdueAmount.toLocaleString()} in overdue payments. Follow up with clients to improve cash flow.`,
      priority,
      data: { count: metrics.overdueInvoices, amount: metrics.overdueAmount },
    });
  }

  if (metrics.lowStockCount > 0) {
    insights.push({
      type: "inventory",
      title: `${metrics.lowStockCount} product${metrics.lowStockCount > 1 ? "s" : ""} below reorder point`,
      description: "Review inventory levels and place purchase orders to avoid stockouts.",
      priority: metrics.lowStockCount > 10 ? "high" : "normal",
      data: { count: metrics.lowStockCount },
    });
  }

  if (metrics.monthlyRevenue > 0 && metrics.monthlyExpenses > metrics.monthlyRevenue) {
    insights.push({
      type: "profitability",
      title: "Expenses exceed revenue this month",
      description: `Revenue KES ${metrics.monthlyRevenue.toLocaleString()} vs expenses KES ${metrics.monthlyExpenses.toLocaleString()}. Review discretionary spending.`,
      priority: "high",
      data: { revenue: metrics.monthlyRevenue, expenses: metrics.monthlyExpenses },
    });
  }

  if (metrics.highSeverityAlerts > 0) {
    insights.push({
      type: "compliance",
      title: `${metrics.highSeverityAlerts} high-severity compliance alert${metrics.highSeverityAlerts > 1 ? "s" : ""}`,
      description: "Address compliance alerts promptly to avoid penalties or service interruptions.",
      priority: "urgent",
      data: { count: metrics.highSeverityAlerts },
    });
  }

  if (metrics.invoicesThisMonth === 0 && metrics.monthlyRevenue === 0) {
    insights.push({
      type: "activity",
      title: "No activity this month",
      description: "No invoices or revenue recorded yet. Consider outreach or marketing campaigns.",
      priority: "normal",
      data: {},
    });
  }

  return insights;
}

export async function createInsightsForOrg(
  organizationId: string,
  userId: string
): Promise<Insight[]> {
  const metrics = await fetchBusinessMetrics(organizationId);
  const insights = generateInsights(metrics);

  for (const insight of insights) {
    await db.insert(aiInsights).values({
      userId,
      organizationId,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      data: insight.data,
    });
  }

  return insights;
}
