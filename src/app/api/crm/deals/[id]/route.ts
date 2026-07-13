import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmDeals, crmCompanies, crmContacts, crmLeads, crmPipelineStages } from "@/db/schema";
import { crmDealSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const deal = await db.query.crmDeals.findFirst({
    where: and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)),
    with: { stage: true, company: true, contact: true, owner: true, lead: true },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.deals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = crmDealSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmDeals.findFirst({
    where: and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.amount !== undefined) data.amount = parsed.data.amount.toString();
  if (parsed.data.companyId === "") data.companyId = null;
  if (parsed.data.contactId === "") data.contactId = null;
  if (parsed.data.leadId === "") data.leadId = null;
  if (parsed.data.ownerId === "") data.ownerId = null;

  // Resolving status from an explicit stage terminal flag.
  let stageId = parsed.data.stageId;
  if (stageId && stageId !== existing.stageId) {
    const stage = await db.query.crmPipelineStages.findFirst({
      where: eq(crmPipelineStages.id, stageId),
      columns: { isWon: true, isLost: true, probability: true },
    });
    if (stage?.isWon) data.status = "won";
    else if (stage?.isLost) data.status = "lost";
    if (stage?.probability !== undefined && (data.probability === undefined || data.probability === null)) {
      data.probability = stage.probability;
    }
  }

  // Set close dates on terminal transitions.
  if (data.status === "won" || data.status === "lost") {
    if (!existing.actualCloseDate) data.actualCloseDate = new Date();
  } else if (data.status === "open") {
    data.actualCloseDate = null;
  }
  if (parsed.data.status) data.status = parsed.data.status;

  const [updated] = await db
    .update(crmDeals)
    .set(data)
    .where(and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.deal.update",
    category: "crm",
    resourceType: "crm_deal",
    resourceId: updated.id,
    description: `Updated deal ${updated.name}`,
    newValues: parsed.data,
  });

  // Notifications + timeline for terminal outcomes.
  if (
    (updated.status === "won" || updated.status === "lost") &&
    existing.status === "open"
  ) {
    await createNotification({
      organizationId: ctx.organizationId,
      category: "crm",
      type: updated.status === "won" ? "crm_deal_won" : "crm_deal_lost",
      title: updated.status === "won" ? "Deal won" : "Deal lost",
      message: `${updated.name} (${updated.currency} ${updated.amount})`,
      priority: updated.status === "won" ? "high" : "normal",
      deepLink: "/dashboard/crm/pipeline",
    });
    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: updated.status === "won" ? "crm.deal.won" : "crm.deal.lost",
        title: `Deal ${updated.status}: ${updated.name}`,
        description: `${updated.currency} ${updated.amount}${updated.status === "lost" ? ` · ${updated.lostReason ?? "no reason"}` : ""}`,
        resourceType: "crm_deal",
        resourceId: updated.id,
        metadata: { status: updated.status, amount: updated.amount },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.deal won/lost):", e);
    }
  }

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

  const deal = await db.query.crmDeals.findFirst({
    where: and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)),
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(crmDeals)
    .where(and(eq(crmDeals.id, id), eq(crmDeals.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.deal.delete",
    category: "crm",
    resourceType: "crm_deal",
    resourceId: id,
    description: `Deleted deal ${deal.name}`,
    oldValues: { name: deal.name },
  });

  return NextResponse.json({ success: true });
}
