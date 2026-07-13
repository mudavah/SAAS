import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmPipelineStages } from "@/db/schema";
import { crmPipelineStageSchema } from "@/lib/validations";
import { eq, asc, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { getPipelineStages, ensureDefaultPipelineStages } from "@/lib/crm/pipeline";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const stages = await getPipelineStages(ctx.organizationId, ctx.userId!);
  return NextResponse.json(stages);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.deals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const parsed = crmPipelineStageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    await ensureDefaultPipelineStages(ctx.organizationId, ctx.userId!);

    // Keep a single default & single terminal stage sane.
    if (parsed.data.isDefault) {
      await db
        .update(crmPipelineStages)
        .set({ isDefault: false })
        .where(eq(crmPipelineStages.organizationId, ctx.organizationId));
    }

    const [stage] = await db
      .insert(crmPipelineStages)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "crm.pipeline_stage.create",
      category: "crm",
      resourceType: "crm_pipeline_stage",
      resourceId: stage.id,
      description: `Created pipeline stage ${stage.name}`,
      newValues: { name: stage.name, probability: stage.probability },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error("Create pipeline stage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
