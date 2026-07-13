import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmDeals, crmPipelineStages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { z } from "zod";

const stageMoveSchema = z.object({
  stageId: z.string().min(1),
  probability: z.coerce.number().min(0).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.deals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = stageMoveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const deal = await db.query.crmDeals.findFirst({
    where: and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)),
  });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const stage = await db.query.crmPipelineStages.findFirst({
    where: and(
      eq(crmPipelineStages.id, parsed.data.stageId),
      eq(crmPipelineStages.organizationId, ctx.organizationId)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  let status = deal.status;
  if (stage.isWon) status = "won";
  else if (stage.isLost) status = "lost";
  else status = "open";

  const probability =
    parsed.data.probability ?? (status === "open" ? stage.probability : status === "won" ? 100 : 0);

  const [updated] = await db
    .update(crmDeals)
    .set({
      stageId: stage.id,
      status,
      probability,
      actualCloseDate:
        status === "won" || status === "lost"
          ? deal.actualCloseDate ?? new Date()
          : null,
      updatedAt: new Date(),
    })
    .where(and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.deal.move_stage",
    category: "crm",
    resourceType: "crm_deal",
    resourceId: updated.id,
    description: `Moved deal ${updated.name} to ${stage.name}`,
    newValues: { stageId: stage.id, stageName: stage.name, status },
  });

  if ((status === "won" || status === "lost") && deal.status === "open") {
    await createNotification({
      organizationId: ctx.organizationId,
      category: "crm",
      type: status === "won" ? "crm_deal_won" : "crm_deal_lost",
      title: status === "won" ? "Deal won" : "Deal lost",
      message: `${updated.name} → ${stage.name}`,
      priority: status === "won" ? "high" : "normal",
      deepLink: "/dashboard/crm/pipeline",
    });
    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: status === "won" ? "crm.deal.won" : "crm.deal.lost",
        title: `Deal ${status}: ${updated.name}`,
        description: `Moved to ${stage.name}`,
        resourceType: "crm_deal",
        resourceId: updated.id,
        metadata: { stageName: stage.name, status },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.deal won/lost):", e);
    }
  }

  return NextResponse.json(updated);
}
