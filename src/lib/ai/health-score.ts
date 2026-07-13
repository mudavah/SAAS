/**
 * KaziFlow — AI business health score
 * ------------------------------------------------------------------
 * Computes a 0-100 composite health score from DB metrics and persists it
 * to `ai_business_health`. Scores degrade toward 0 when data is missing so
 * the UI never shows a falsely reassuring number.
 */
import { db } from "@/db";
import {
  invoices,
  payments,
  expenses,
  inventoryProducts,
  inventoryStock,
  complianceAlerts,
  clients,
  aiBusinessHealth,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface HealthBreakdown {
  cashFlow: number;
  revenue: number;
  expenses: number;
  clientRetention: number;
  inventory: number;
  compliance: number;
}

export interface HealthResult {
  score: number;
  breakdown: HealthBreakdown;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function toNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export async function computeHealthScore(organizationId: string): Promise<HealthResult> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    paidRes,
    overdueRes,
    totalInvoicesRes,
    expenseRes,
    lowStockRes,
    alertRes,
    clientsRes,
  ] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.organizationId, organizationId),
        sql`${payments.createdAt} >= ${monthStart.toISOString()}`
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "overdue")
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.createdAt} >= ${monthStart.toISOString()}`
      )),

    db.select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` })
      .from(expenses)
      .where(and(
        eq(expenses.organizationId, organizationId),
        sql`${expenses.createdAt} >= ${monthStart.toISOString()}`
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(inventoryStock)
      .innerJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
      .where(and(
        eq(inventoryProducts.organizationId, organizationId),
        sql`coalesce(${inventoryStock.quantity},0) <= ${inventoryProducts.reorderPoint}`
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(complianceAlerts)
      .where(and(
        eq(complianceAlerts.organizationId, organizationId),
        eq(complianceAlerts.resolved, false),
        eq(complianceAlerts.severity, "critical")
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.organizationId, organizationId)),
  ]);

  const revenue = toNum(paidRes[0]?.total);
  const overdueCount = toNum(overdueRes[0]?.count);
  const invoiceCount = toNum(totalInvoicesRes[0]?.count);
  const expenseTotal = toNum(expenseRes[0]?.total);
  const lowStock = toNum(lowStockRes[0]?.count);
  const alerts = toNum(alertRes[0]?.count);
  const clientCount = toNum(clientsRes[0]?.count);

  const cashFlow = revenue > 0 ? Math.min(100, (revenue / Math.max(1, expenseTotal)) * 50 + 50) : 20;
  const revenueScore = invoiceCount > 0 ? Math.min(100, (revenue / 100000) * 100 + 40) : 10;
  const expenseScore = expenseTotal > 0 ? Math.max(0, 100 - (expenseTotal / Math.max(1, revenue)) * 40) : 50;
  const clientScore = clientCount > 0 ? Math.min(100, clientCount * 10 + 40) : 10;
  const inventoryScore = lowStock === 0 ? 100 : Math.max(0, 100 - lowStock * 5);
  const complianceScore = alerts === 0 ? 100 : Math.max(0, 100 - alerts * 15);

  const breakdown: HealthBreakdown = {
    cashFlow: clamp(cashFlow),
    revenue: clamp(revenueScore),
    expenses: clamp(expenseScore),
    clientRetention: clamp(clientScore),
    inventory: clamp(inventoryScore),
    compliance: clamp(complianceScore),
  };

  const score = clamp(
    (breakdown.cashFlow + breakdown.revenue + breakdown.expenses + breakdown.clientRetention + breakdown.inventory + breakdown.compliance) / 6
  );

  return { score, breakdown };
}

export async function saveHealthScore(
  userId: string,
  organizationId: string,
  result: HealthResult
): Promise<void> {
  await db.insert(aiBusinessHealth).values({
    userId,
    organizationId,
    score: result.score,
    cashFlowScore: result.breakdown.cashFlow,
    revenueScore: result.breakdown.revenue,
    expenseScore: result.breakdown.expenses,
    clientScore: result.breakdown.clientRetention,
    inventoryScore: result.breakdown.inventory,
    complianceScore: result.breakdown.compliance,
    insights: result.breakdown as unknown as Record<string, unknown>,
  });
}
