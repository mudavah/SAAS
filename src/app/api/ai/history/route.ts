import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  aiForecasts,
  aiInsights,
  aiReports,
  aiDocuments,
  aiTaskRecommendations,
  aiChurnPredictions,
  aiQueryLogs,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const orgId = ctx.organizationId;
  const count = async (table: any) => {
    const [r] = await db.select({ c: sql<number>`count(*)` }).from(table).where(eq(table.organizationId, orgId));
    return Number(r?.c ?? 0);
  };

  const [forecasts, insights, reports, documents, tasks, churn, queries] = await Promise.all([
    db.query.aiForecasts.findMany({ where: eq(aiForecasts.organizationId, orgId), orderBy: (f: any) => [desc(f.createdAt)], limit: 5 }),
    db.query.aiInsights.findMany({ where: eq(aiInsights.organizationId, orgId), orderBy: (i: any) => [desc(i.createdAt)], limit: 5 }),
    db.query.aiReports.findMany({ where: eq(aiReports.organizationId, orgId), orderBy: (r: any) => [desc(r.createdAt)], limit: 5 }),
    db.query.aiDocuments.findMany({ where: eq(aiDocuments.organizationId, orgId), orderBy: (d: any) => [desc(d.createdAt)], limit: 5 }),
    db.query.aiTaskRecommendations.findMany({ where: eq(aiTaskRecommendations.organizationId, orgId), orderBy: (t: any) => [desc(t.createdAt)], limit: 5 }),
    db.query.aiChurnPredictions.findMany({ where: eq(aiChurnPredictions.organizationId, orgId), orderBy: (c: any) => [desc(c.score)], limit: 5 }),
    db.query.aiQueryLogs.findMany({ where: eq(aiQueryLogs.organizationId, orgId), orderBy: (q: any) => [desc(q.createdAt)], limit: 5 }),
  ]);

  const counts = {
    forecasts: await count(aiForecasts),
    insights: await count(aiInsights),
    reports: await count(aiReports),
    documents: await count(aiDocuments),
    tasks: await count(aiTaskRecommendations),
    churn: await count(aiChurnPredictions),
    queries: await count(aiQueryLogs),
  };

  return NextResponse.json({
    data: { counts, recent: { forecasts, insights, reports, documents, tasks, churn, queries } },
  });
}
