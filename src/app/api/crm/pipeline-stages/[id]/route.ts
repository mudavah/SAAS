import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmPipelineStages, crmDeals } from "@/db/schema";
import { crmPipelineStageSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.deals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = crmPipelineStageSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmPipelineStages.findFirst({
    where: and(eq(crmPipelineStages.id, id), eq(crmPipelineStages.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.isDefault) {
    await db
      .update(crmPipelineStages)
      .set({ isDefault: false })
      .where(
        and(
          eq(crmPipelineStages.organizationId, ctx.organizationId),
          eq(crmPipelineStages.isDefault, true)
        )
      );
  }

  const [updated] = await db
    .update(crmPipelineStages)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(crmPipelineStages.id, id), eq(crmPipelineStages.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.pipeline_stage.update",
    category: "crm",
    resourceType: "crm_pipeline_stage",
    resourceId: updated.id,
    description: `Updated pipeline stage ${updated.name}`,
    newValues: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.deals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const stage = await db.query.crmPipelineStages.findFirst({
    where: and(eq(crmPipelineStages.id, id), eq(crmPipelineStages.organizationId, ctx.organizationId)),
  });
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reassign any deals on this stage back to the org's default stage.
  const defaultStage = await db.query.crmPipelineStages.findFirst({
    where: and(
      eq(crmPipelineStages.organizationId, ctx.organizationId),
      eq(crmPipelineStages.isDefault, true)
    ),
    orderBy: (s) => [s.order],
  });
  const fallbackId = defaultStage && defaultStage.id !== id ? defaultStage.id : null;
  await db
    .update(crmDeals)
    .set({ stageId: fallbackId })
    .where(
      and(eq(crmDeals.organizationId, ctx.organizationId), eq(crmDeals.stageId, id))
    );

  await db
    .delete(crmPipelineStages)
    .where(and(eq(crmPipelineStages.id, id), eq(crmPipelineStages.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.pipeline_stage.delete",
    category: "crm",
    resourceType: "crm_pipeline_stage",
    resourceId: id,
    description: `Deleted pipeline stage ${stage.name}`,
  });

  return NextResponse.json({ success: true });
}
