import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { analyticsDashboards } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "analytics.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const dashboards = await db
    .select()
    .from(analyticsDashboards)
    .where(eq(analyticsDashboards.organizationId, ctx.organizationId));
  return NextResponse.json(dashboards);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "analytics.dashboards.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { name, description, layout, isDefault, isShared, sharedWithRoles } = body;

  const [dashboard] = await db
    .insert(analyticsDashboards)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name,
      description,
      layout: layout ?? {},
      isDefault: isDefault ?? false,
      isShared: isShared ?? false,
      sharedWithRoles: sharedWithRoles ?? [],
    })
    .returning();

  return NextResponse.json(dashboard);
}
