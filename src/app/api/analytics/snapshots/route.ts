import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { analyticsSnapshots } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "analytics.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const widgetId = url.searchParams.get("widgetId");
  const dashboardId = url.searchParams.get("dashboardId");
  const period = url.searchParams.get("period");

  const conditions = [eq(analyticsSnapshots.organizationId, ctx.organizationId)];
  if (widgetId) conditions.push(eq(analyticsSnapshots.widgetId, widgetId));
  if (dashboardId) conditions.push(eq(analyticsSnapshots.dashboardId, dashboardId));
  if (period) conditions.push(eq(analyticsSnapshots.period, period as never));

  const snapshots = await db
    .select()
    .from(analyticsSnapshots)
    .where(and(...conditions));

  return NextResponse.json(snapshots);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "analytics.dashboards.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { widgetId, dashboardId, period, periodStart, periodEnd, data } = body;

  const [snapshot] = await db
    .insert(analyticsSnapshots)
    .values({
      organizationId: ctx.organizationId,
      widgetId,
      dashboardId,
      period,
      periodStart: periodStart ? new Date(periodStart) : new Date(),
      periodEnd: periodEnd ? new Date(periodEnd) : new Date(),
      data: data ?? {},
    })
    .returning();

  return NextResponse.json(snapshot);
}
