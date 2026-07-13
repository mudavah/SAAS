import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmActivities } from "@/db/schema";
import { crmActivitySchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const activity = await db.query.crmActivities.findFirst({
    where: and(eq(crmActivities.id, id), eq(crmActivities.organizationId, ctx.organizationId)),
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(activity);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.activities.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = crmActivitySchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmActivities.findFirst({
    where: and(eq(crmActivities.id, id), eq(crmActivities.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.status === "completed" && !existing.completedAt) {
    data.completedAt = new Date();
  }
  if (parsed.data.status && parsed.data.status !== "completed") {
    data.completedAt = null;
  }

  const [updated] = await db
    .update(crmActivities)
    .set(data)
    .where(and(eq(crmActivities.id, id), eq(crmActivities.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.activity.update",
    category: "crm",
    resourceType: "crm_activity",
    resourceId: updated.id,
    description: `Updated activity ${updated.subject}`,
    newValues: parsed.data,
  });

  if (updated.status === "completed" && existing.status !== "completed") {
    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.activity.completed",
        title: `Activity completed: ${updated.subject}`,
        description: updated.type,
        resourceType: "crm_activity",
        resourceId: updated.id,
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.activity.completed):", e);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.activities.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const activity = await db.query.crmActivities.findFirst({
    where: and(eq(crmActivities.id, id), eq(crmActivities.organizationId, ctx.organizationId)),
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(crmActivities)
    .where(and(eq(crmActivities.id, id), eq(crmActivities.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.activity.delete",
    category: "crm",
    resourceType: "crm_activity",
    resourceId: id,
    description: `Deleted activity ${activity.subject}`,
  });

  return NextResponse.json({ success: true });
}
