/**
 * KaziFlow — API Analytics
 * ------------------------------------------------------------------
 * Aggregates API usage metrics for organizations and API keys.
 * Computes daily rollups from the `api_usage` table and surfaces
 * trends, top endpoints, error rates, and latency percentiles.
 */

import { db } from "@/db";
import { apiUsage, apiAnalyticsDaily } from "@/db/schema";
import { eq, and, gte, lt, desc, sql, count, avg } from "drizzle-orm";

export interface ApiUsageAnalytics {
  startDate: string;
  endDate: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topStatusCodes: Array<{ statusCode: number; count: number }>;
  requestsByDay: Array<{ date: string; count: number }>;
}

async function getAggregates(organizationId: string, startDate: Date, endDate: Date) {
  const conditions = [
    eq(apiUsage.organizationId, organizationId),
    gte(apiUsage.createdAt, startDate),
    lt(apiUsage.createdAt, endDate),
  ];

  const [stats] = await db
    .select({
      totalRequests: count(),
      successfulRequests: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.statusCode} >= 200 AND ${apiUsage.statusCode} < 300 THEN 1 ELSE 0 END), 0)`,
      failedRequests: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.statusCode} >= 400 THEN 1 ELSE 0 END), 0)`,
      avgResponseTimeMs: avg(apiUsage.responseTimeMs),
    })
    .from(apiUsage)
    .where(and(...conditions));

  const topEndpoints = await db
    .select({
      endpoint: apiUsage.endpoint,
      count: sql<number>`COUNT(*)`,
    })
    .from(apiUsage)
    .where(and(...conditions))
    .groupBy(apiUsage.endpoint)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  const topStatusCodes = await db
    .select({
      statusCode: apiUsage.statusCode,
      count: sql<number>`COUNT(*)`,
    })
    .from(apiUsage)
    .where(and(...conditions))
    .groupBy(apiUsage.statusCode)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  const requestsByDay = await db
    .select({
      date: sql<string>`DATE(${apiUsage.createdAt})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(apiUsage)
    .where(and(...conditions))
    .groupBy(sql`DATE(${apiUsage.createdAt})`)
    .orderBy(sql`DATE(${apiUsage.createdAt})`);

  let p95ResponseTimeMs = 0;
  let p99ResponseTimeMs = 0;

  try {
    const p95Result = await db
      .select({
        val: sql<number>`COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${apiUsage.responseTimeMs}), 0)`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.organizationId, organizationId),
          gte(apiUsage.createdAt, startDate),
          lt(apiUsage.createdAt, endDate),
          sql`${apiUsage.responseTimeMs} IS NOT NULL`
        )
      );
    p95ResponseTimeMs = Number(p95Result[0]?.val ?? 0);
  } catch {
    // PERCENTILE_CONT may not be available in all Postgres versions
  }

  try {
    const p99Result = await db
      .select({
        val: sql<number>`COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${apiUsage.responseTimeMs}), 0)`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.organizationId, organizationId),
          gte(apiUsage.createdAt, startDate),
          lt(apiUsage.createdAt, endDate),
          sql`${apiUsage.responseTimeMs} IS NOT NULL`
        )
      );
    p99ResponseTimeMs = Number(p99Result[0]?.val ?? 0);
  } catch {
    // PERCENTILE_CONT may not be available in all Postgres versions
  }

  return {
    totalRequests: Number(stats?.totalRequests ?? 0),
    successfulRequests: Number(stats?.successfulRequests ?? 0),
    failedRequests: Number(stats?.failedRequests ?? 0),
    avgResponseTimeMs: Number(stats?.avgResponseTimeMs ?? 0),
    topEndpoints: (topEndpoints || []).map((r) => ({
      endpoint: r.endpoint,
      count: Number(r.count),
    })),
    topStatusCodes: (topStatusCodes || []).map((r) => ({
      statusCode: Number(r.statusCode),
      count: Number(r.count),
    })),
    requestsByDay: (requestsByDay || []).map((r) => ({
      date: r.date as string,
      count: Number(r.count),
    })),
    p95ResponseTimeMs,
    p99ResponseTimeMs,
  };
}

export async function getApiUsageAnalytics(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ApiUsageAnalytics> {
  const agg = await getAggregates(organizationId, startDate, endDate);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalRequests: agg.totalRequests,
    successfulRequests: agg.successfulRequests,
    failedRequests: agg.failedRequests,
    errorRate: agg.totalRequests > 0 ? (agg.failedRequests / agg.totalRequests) * 100 : 0,
    avgResponseTimeMs: agg.avgResponseTimeMs,
    p95ResponseTimeMs: agg.p95ResponseTimeMs,
    p99ResponseTimeMs: agg.p99ResponseTimeMs,
    topEndpoints: agg.topEndpoints,
    topStatusCodes: agg.topStatusCodes,
    requestsByDay: agg.requestsByDay,
  };
}

export async function getApiKeyAnalytics(
  organizationId: string,
  apiKeyId: string,
  startDate: Date,
  endDate: Date
): Promise<ApiUsageAnalytics> {
  const conditions = [
    eq(apiUsage.organizationId, organizationId),
    eq(apiUsage.apiKeyId, apiKeyId),
    gte(apiUsage.createdAt, startDate),
    lt(apiUsage.createdAt, endDate),
  ];

  const [stats] = await db
    .select({
      totalRequests: count(),
      successfulRequests: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.statusCode} >= 200 AND ${apiUsage.statusCode} < 300 THEN 1 ELSE 0 END), 0)`,
      failedRequests: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.statusCode} >= 400 THEN 1 ELSE 0 END), 0)`,
      avgResponseTimeMs: avg(apiUsage.responseTimeMs),
    })
    .from(apiUsage)
    .where(and(...conditions));

  const topEndpoints = await db
    .select({
      endpoint: apiUsage.endpoint,
      count: sql<number>`COUNT(*)`,
    })
    .from(apiUsage)
    .where(and(...conditions))
    .groupBy(apiUsage.endpoint)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalRequests: Number(stats?.totalRequests ?? 0),
    successfulRequests: Number(stats?.successfulRequests ?? 0),
    failedRequests: Number(stats?.failedRequests ?? 0),
    errorRate: Number(stats?.totalRequests ?? 0) > 0 ? (Number(stats?.failedRequests ?? 0) / Number(stats?.totalRequests ?? 0)) * 100 : 0,
    avgResponseTimeMs: Number(stats?.avgResponseTimeMs ?? 0),
    p95ResponseTimeMs: 0,
    p99ResponseTimeMs: 0,
    topEndpoints: (topEndpoints || []).map((r) => ({
      endpoint: r.endpoint,
      count: Number(r.count),
    })),
    topStatusCodes: [],
    requestsByDay: [],
  };
}

export async function aggregateDailyAnalytics(
  organizationId: string,
  date: string
): Promise<void> {
  const dayStart = new Date(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const conditions = [
    eq(apiUsage.organizationId, organizationId),
    gte(apiUsage.createdAt, dayStart),
    lt(apiUsage.createdAt, dayEnd),
  ];

  const topEndpoints = await db
    .select({
      endpoint: apiUsage.endpoint,
      count: sql<number>`COUNT(*)`,
    })
    .from(apiUsage)
    .where(and(...conditions))
    .groupBy(apiUsage.endpoint)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(20);

  const topEndpointsMap: Record<string, number> = {};
  for (const row of topEndpoints || []) {
    topEndpointsMap[row.endpoint] = Number(row.count);
  }

  const keyRows = await db
    .select({
      apiKeyId: apiUsage.apiKeyId,
      total: sql<number>`COUNT(*)`,
      successful: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.statusCode} >= 200 AND ${apiUsage.statusCode} < 300 THEN 1 ELSE 0 END), 0)`,
      failed: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.statusCode} >= 400 THEN 1 ELSE 0 END), 0)`,
      avg: avg(apiUsage.responseTimeMs),
    })
    .from(apiUsage)
    .where(
      and(
        eq(apiUsage.organizationId, organizationId),
        gte(apiUsage.createdAt, dayStart),
        lt(apiUsage.createdAt, dayEnd),
        sql`${apiUsage.apiKeyId} IS NOT NULL`
      )
    )
    .groupBy(apiUsage.apiKeyId);

  for (const row of keyRows || []) {
    if (!row.apiKeyId) continue;
    await db
      .insert(apiAnalyticsDaily)
      .values({
        organizationId,
        apiKeyId: row.apiKeyId,
        date,
        totalRequests: Number(row.total),
        successfulRequests: Number(row.successful),
        failedRequests: Number(row.failed),
        avgResponseTimeMs: Number(row.avg),
        topEndpoints: topEndpointsMap,
      })
      .onConflictDoNothing({
        target: [apiAnalyticsDaily.organizationId, apiAnalyticsDaily.apiKeyId, apiAnalyticsDaily.date],
      });
  }
}
