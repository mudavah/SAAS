import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { analyticsWidgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "analytics.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const dashboardId = url.searchParams.get("dashboardId");

  const widgets = dashboardId
    ? await db
        .select()
        .from(analyticsWidgets)
        .where(
          and(
            eq(analyticsWidgets.dashboardId, dashboardId),
            eq(analyticsWidgets.organizationId, ctx.organizationId)
          )
        )
    : await db
        .select()
        .from(analyticsWidgets)
        .where(eq(analyticsWidgets.organizationId, ctx.organizationId));

  return NextResponse.json(widgets);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "analytics.dashboards.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { dashboardId, name, type, config, dataSource, position, refreshInterval } = body;

  const [widget] = await db
    .insert(analyticsWidgets)
    .values({
      organizationId: ctx.organizationId,
      dashboardId,
      name,
      type,
      config: config ?? {},
      dataSource,
      position: position ?? { x: 0, y: 0, w: 4, h: 4 },
      refreshInterval: refreshInterval ?? 300,
    })
    .returning();

  return NextResponse.json(widget);
}
