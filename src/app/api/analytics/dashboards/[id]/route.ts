import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { analyticsDashboards } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "analytics.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const [dashboard] = await db
    .select()
    .from(analyticsDashboards)
    .where(
      and(
        eq(analyticsDashboards.id, id),
        eq(analyticsDashboards.organizationId, ctx.organizationId)
      )
    );

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(dashboard);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "analytics.dashboards.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const body = await req.json();
  const { name, description, layout, isDefault, isShared, sharedWithRoles } = body;

  const [dashboard] = await db
    .update(analyticsDashboards)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(layout !== undefined ? { layout } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
      ...(isShared !== undefined ? { isShared } : {}),
      ...(sharedWithRoles !== undefined ? { sharedWithRoles } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(analyticsDashboards.id, id),
        eq(analyticsDashboards.organizationId, ctx.organizationId)
      )
    )
    .returning();

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(dashboard);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "analytics.dashboards.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const [deleted] = await db
    .delete(analyticsDashboards)
    .where(
      and(
        eq(analyticsDashboards.id, id),
        eq(analyticsDashboards.organizationId, ctx.organizationId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
