/**
 * KaziFlow — AI Forecasting
 * ------------------------------------------------------------------
 * Revenue, cash-flow and inventory forecasting. The math is deterministic
 * (monthly aggregation + linear trend with confidence bands) so it runs
 * without an LLM and is unit-testable; an optional LLM layer adds a narrative.
 * All queries are org-scoped.
 */
import { db } from "@/db";
import {
  payments,
  expenses,
  invoices,
  inventoryStock,
  inventoryProducts,
  posOrderItems,
} from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { callOpenAI } from "./copilot";

export interface ForecastPoint {
  period: string; // YYYY-MM
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  type: "revenue" | "cash_flow" | "inventory";
  series: ForecastPoint[];
  confidence: number;
  summary: string;
  model: string;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

/** Simple ordinary-least-squares slope/intercept over indexed monthly values. */
function linearTrend(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

async function monthlyTotals(
  table: any,
  amountCol: any,
  dateCol: any,
  orgId: string,
  statusCol?: any,
  statusValue?: string,
  sinceMonths = 12
): Promise<Map<string, number>> {
  const since = new Date();
  since.setMonth(since.getMonth() - sinceMonths);
  const conditions = [eq(table.organizationId, orgId), gte(dateCol, since)];
  if (statusCol && statusValue) conditions.push(eq(statusCol, statusValue));
  const rows = (await db
    .select({
      month: sql<string>`to_char(${dateCol}, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(${amountCol}),0)`,
    })
    .from(table)
    .where(and(...conditions))
    .groupBy(sql`1`)
    .orderBy(sql`1`)) as { month: string; total: number }[];
  return new Map(rows.map((r) => [r.month, Number(r.total)]));
}

function fillSeries(map: Map<string, number>, months: number): { month: string; value: number }[] {
  const out: { month: string; value: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const key = addMonths(monthKey(now), -i);
    out.push({ month: key, value: map.get(key) ?? 0 });
  }
  return out;
}

function project(series: { month: string; value: number }[], horizon: number): ForecastPoint[] {
  const values = series.map((s) => s.value);
  const { slope, intercept } = linearTrend(values);
  const sd = stddev(values) || Math.max(1, Math.abs(intercept) * 0.1);
  const lastMonth = series[series.length - 1]?.month ?? monthKey(new Date());
  const out: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    const idx = values.length + i - 1;
    const predicted = Math.max(0, intercept + slope * idx);
    const band = sd * Math.sqrt(i) * 1.28; // ~80% band
    out.push({
      period: addMonths(lastMonth, i),
      value: Math.round(predicted),
      lower: Math.round(Math.max(0, predicted - band)),
      upper: Math.round(predicted + band),
    });
  }
  return out;
}

export async function getRevenueForecast(
  organizationId: string,
  horizon = 6
): Promise<ForecastResult> {
  const paymentsMap = await monthlyTotals(
    payments,
    payments.amount,
    payments.createdAt,
    organizationId,
    payments.status,
    "completed"
  );
  const history = fillSeries(paymentsMap, 12);
  const series = project(history, horizon);
  const recent = history.slice(-3).reduce((a, b) => a + b.value, 0);
  const projected = series.reduce((a, b) => a + b.value, 0);
  const summary = `Projected revenue for the next ${horizon} month(s): KES ${projected.toLocaleString()}. Recent 3-month actuals: KES ${recent.toLocaleString()}.`;
  return { type: "revenue", series, confidence: 70, summary, model: "rules" };
}

export async function getCashFlowForecast(
  organizationId: string,
  horizon = 6
): Promise<ForecastResult> {
  const revMap = await monthlyTotals(
    payments,
    payments.amount,
    payments.createdAt,
    organizationId,
    payments.status,
    "completed"
  );
  const expMap = await monthlyTotals(
    expenses,
    expenses.amount,
    expenses.createdAt,
    organizationId
  );
  const revSeries = fillSeries(revMap, 12);
  const expSeries = fillSeries(expMap, 12);
  const net = revSeries.map((r, i) => ({
    month: r.month,
    value: r.value - (expSeries[i]?.value ?? 0),
  }));
  const series = project(net, horizon);
  const projected = series.reduce((a, b) => a + b.value, 0);
  const summary = `Projected net cash flow (next ${horizon} mo): KES ${projected.toLocaleString()}. ${projected < 0 ? "Watch liquidity — expenses may outpace inflows." : "Liquidity looks healthy."}`;
  return { type: "cash_flow", series, confidence: 68, summary, model: "rules" };
}

export interface InventoryForecastItem {
  productId: string;
  name: string;
  onHand: number;
  avgDailySales: number;
  daysOfStock: number | null;
  reorderSuggested: boolean;
  suggestedReorderQty: number;
}

/**
 * Inventory forecast: project days-of-stock per product from recent sales
 * velocity (POS order items + invoice items as proxies) and current stock.
 */
export async function getInventoryForecast(
  organizationId: string,
  lookbackDays = 30
): Promise<{ items: InventoryForecastItem[]; summary: string }> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  // recent sales velocity from POS order items (proxy for movements)
  const salesRows = (await db
    .select({
      productId: posOrderItems.productId,
      qty: sql<number>`coalesce(sum(${posOrderItems.quantity}),0)`,
    })
    .from(posOrderItems)
    .innerJoin(inventoryStock, eq(posOrderItems.productId, inventoryStock.productId))
    .where(and(eq(posOrderItems.organizationId, organizationId)))
    .groupBy(posOrderItems.productId)) as { productId: string; qty: number }[];

  const velocity = new Map(salesRows.map((r) => [r.productId, Number(r.qty) / lookbackDays]));

  const stock = await db.query.inventoryStock.findMany({
    where: eq(inventoryStock.organizationId, organizationId),
    with: { product: true },
  });

  const items: InventoryForecastItem[] = stock.map((s) => {
    const product = s.product as { name?: string; reorderPoint?: number | null } | null;
    const onHand = Number(s.quantity);
    const daily = velocity.get(s.productId) ?? 0;
    const daysOfStock = daily > 0 ? onHand / daily : null;
    const reorderPoint = Number(product?.reorderPoint ?? 0);
    const reorderSuggested = onHand <= reorderPoint || (daysOfStock !== null && daysOfStock <= 14);
    const suggestedReorderQty = Math.max(
      reorderPoint - onHand,
      Math.ceil(daily * 30)
    );
    return {
      productId: s.productId,
      name: product?.name ?? "Unknown",
      onHand,
      avgDailySales: Number(daily.toFixed(2)),
      daysOfStock: daysOfStock === null ? null : Math.round(daysOfStock),
      reorderSuggested,
      suggestedReorderQty: Math.round(suggestedReorderQty),
    };
  });

  const low = items.filter((i) => i.reorderSuggested).length;
  return {
    items: items.sort((a, b) => (a.daysOfStock ?? 1e9) - (b.daysOfStock ?? 1e9)),
    summary: `${items.length} products analysed. ${low} need reorder attention.`,
  };
}

/** Optional natural-language narrative for a forecast. */
export async function forecastNarrative(result: ForecastResult): Promise<string> {
  try {
    return await callOpenAI(
      "You are a concise financial analyst for a Kenyan SME.",
      `Explain this forecast in 2 sentences: ${result.summary}`,
      []
    );
  } catch {
    return result.summary;
  }
}
