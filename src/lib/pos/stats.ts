/**
 * KaziFlow — POS statistics helpers
 * ------------------------------------------------------------------
 * Aggregates sales, top products, payment methods, and session metrics
 * for the POS dashboard.
 */
import { db } from "@/db";
import { posOrders, posOrderItems, posOrderPayments, posSessions } from "@/db/schema";
import { and, eq, gte, sql, sum, count } from "drizzle-orm";

export interface PosDailyStat {
  date: string;
  sales: number;
  orders: number;
  avgOrder: number;
}

export async function getPosDailyStats(
  organizationId: string,
  days = 30
): Promise<PosDailyStat[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${posOrders.completedAt})`,
      sales: sql<number>`coalesce(sum(${posOrders.total}),0)`,
      orders: sql<number>`count(*)`,
      avgOrder: sql<number>`coalesce(avg(${posOrders.total}),0)`,
    })
    .from(posOrders)
    .where(
      and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, since)
      )
    )
    .groupBy(sql`date_trunc('day', ${posOrders.completedAt})`)
    .orderBy(sql`date_trunc('day', ${posOrders.completedAt})`);

  return rows.map((r) => ({
    date: r.date as string,
    sales: Number(r.sales),
    orders: Number(r.orders),
    avgOrder: Number(r.avgOrder),
  }));
}

export async function getPosTopProducts(
  organizationId: string,
  days = 30,
  limit = 10
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      productId: posOrderItems.productId,
      totalQty: sql<number>`sum(${posOrderItems.quantity})`,
      totalRevenue: sql<number>`sum(${posOrderItems.lineTotal})`,
    })
    .from(posOrderItems)
    .innerJoin(posOrders, eq(posOrderItems.orderId, posOrders.id))
    .where(
      and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, since)
      )
    )
    .groupBy(posOrderItems.productId)
    .orderBy(sql`sum(${posOrderItems.quantity}) desc`)
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    totalQty: Number(r.totalQty),
    totalRevenue: Number(r.totalRevenue),
  }));
}

export async function getPosPaymentMethodBreakdown(
  organizationId: string,
  days = 30
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      method: posOrderPayments.method,
      total: sql<number>`sum(${posOrderPayments.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(posOrderPayments)
    .innerJoin(posOrders, eq(posOrderPayments.orderId, posOrders.id))
    .where(
      and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, since)
      )
    )
    .groupBy(posOrderPayments.method);

  return rows.map((r) => ({
    method: r.method,
    total: Number(r.total),
    count: Number(r.count),
  }));
}
