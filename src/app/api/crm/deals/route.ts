import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmDeals, crmCompanies, crmContacts, crmLeads, crmPipelineStages } from "@/db/schema";
import { crmDealSchema } from "@/lib/validations";
import { eq, desc, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  const status = searchParams.get("status");

  const rows = await db.query.crmDeals.findMany({
    where: and(
      eq(crmDeals.organizationId, ctx.organizationId),
      stageId ? eq(crmDeals.stageId, stageId) : undefined,
      status ? eq(crmDeals.status, status as any) : undefined
    ),
    orderBy: (d) => [desc(d.createdAt)],
    with: { stage: true, company: { columns: { id: true, name: true } }, contact: true, owner: { columns: { id: true, name: true } } },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.deals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = crmDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Cross-tenant guards: referenced records must belong to this org.
    const refs = [
      [parsed.data.companyId, crmCompanies],
      [parsed.data.contactId, crmContacts],
      [parsed.data.leadId, crmLeads],
      [parsed.data.stageId, crmPipelineStages],
    ] as const;
    for (const [refId, table] of refs) {
      if (refId) {
        const found = await db
          .select({ id: table.id })
          .from(table as any)
          .where(and(eq((table as any).id, refId), eq((table as any).organizationId, ctx.organizationId)))
          .limit(1);
        if (!found) {
          return NextResponse.json({ error: "Referenced record not found" }, { status: 404 });
        }
      }
    }

    // Default probability from the stage when not explicitly provided.
    let probability = parsed.data.probability ?? null;
    if (probability === null && parsed.data.stageId) {
      const stage = await db.query.crmPipelineStages.findFirst({
        where: eq(crmPipelineStages.id, parsed.data.stageId),
        columns: { probability: true, isWon: true, isLost: true },
      });
      probability = stage?.probability ?? null;
    }

    const [deal] = await db
      .insert(crmDeals)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        name: parsed.data.name,
        companyId: parsed.data.companyId || null,
        contactId: parsed.data.contactId || null,
        leadId: parsed.data.leadId || null,
        stageId: parsed.data.stageId || null,
        amount: (parsed.data.amount ?? 0).toString(),
        currency: parsed.data.currency,
        probability,
        expectedCloseDate: parsed.data.expectedCloseDate ?? null,
        status: parsed.data.status,
        lostReason: parsed.data.lostReason || null,
        ownerId: parsed.data.ownerId || ctx.userId!,
        notes: parsed.data.notes || null,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "crm.deal.create",
      category: "crm",
      resourceType: "crm_deal",
      resourceId: deal.id,
      description: `Created deal ${deal.name}`,
      newValues: { name: deal.name, amount: deal.amount, stageId: deal.stageId },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "crm",
      type: "crm_deal_added",
      title: "Deal created",
      message: `${deal.name} (${deal.currency} ${deal.amount})`,
      deepLink: "/dashboard/crm/pipeline",
    });

    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.deal.created",
        title: `Deal created: ${deal.name}`,
        description: `${deal.currency} ${deal.amount} · ${deal.status}`,
        resourceType: "crm_deal",
        resourceId: deal.id,
        metadata: { amount: deal.amount, status: deal.status },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.deal.created):", e);
    }

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("Create deal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
