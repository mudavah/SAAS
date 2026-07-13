import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmLeads, crmCompanies, crmContacts, crmDeals, crmPipelineStages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { ensureDefaultPipelineStages } from "@/lib/crm/pipeline";

interface ConvertBody {
  createCompany?: boolean;
  companyName?: string;
  createContact?: boolean;
  createDeal?: boolean;
  stageId?: string;
  amount?: number;
  currency?: string;
  ownerId?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.leads.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const lead = await db.query.crmLeads.findFirst({
    where: and(eq(crmLeads.id, id), eq(crmLeads.organizationId, ctx.organizationId)),
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "Lead already converted" }, { status: 409 });
  }

  let body: ConvertBody = {};
  try {
    body = (await req.json()) as ConvertBody;
  } catch {
    body = {};
  }

  const createCompany = body.createCompany ?? true;
  const createContact = body.createContact ?? true;
  const createDeal = body.createDeal ?? false;

  const fullName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();

  try {
    const result = await db.transaction(async (tx) => {
      let companyId: string | null = null;
      let contactId: string | null = null;
      let dealId: string | null = null;

      if (createCompany) {
        const [company] = await tx
          .insert(crmCompanies)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            name: body.companyName || lead.company || fullName,
            email: lead.email || null,
            phone: lead.phone || null,
          })
          .returning();
        companyId = company.id;
      }

      if (createContact) {
        const [contact] = await tx
          .insert(crmContacts)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            companyId,
            firstName: lead.firstName,
            lastName: lead.lastName || null,
            email: lead.email || null,
            phone: lead.phone || null,
            isPrimary: true,
          })
          .returning();
        contactId = contact.id;
      }

      if (createDeal) {
        await ensureDefaultPipelineStages(ctx.organizationId, ctx.userId!);
        let stageId = body.stageId;
        if (!stageId) {
          const defaultStage = await tx.query.crmPipelineStages.findFirst({
            where: and(
              eq(crmPipelineStages.organizationId, ctx.organizationId),
              eq(crmPipelineStages.isDefault, true)
            ),
            orderBy: (s) => [asc(s.order)],
          });
          stageId = defaultStage?.id;
        }
        const [deal] = await tx
          .insert(crmDeals)
          .values({
            organizationId: ctx.organizationId,
            userId: ctx.userId!,
            name: `Deal for ${body.companyName || lead.company || fullName}`,
            companyId,
            contactId,
            leadId: lead.id,
            stageId: stageId ?? null,
            amount: (body.amount ?? Number(lead.estimatedValue) ?? 0).toString(),
            currency: body.currency || "KES",
            ownerId: body.ownerId || ctx.userId!,
          })
          .returning();
        dealId = deal.id;
      }

      const [updatedLead] = await tx
        .update(crmLeads)
        .set({
          status: "converted",
          convertedAt: new Date(),
          convertedCompanyId: companyId,
          convertedContactId: contactId,
          convertedDealId: dealId,
          updatedAt: new Date(),
        })
        .where(eq(crmLeads.id, lead.id))
        .returning();

      return { updatedLead, companyId, contactId, dealId };
    });

    await logAuditSafe(ctx, {
      action: "crm.lead.convert",
      category: "crm",
      resourceType: "crm_lead",
      resourceId: lead.id,
      description: `Converted lead ${fullName} to ${result.companyId ? "company + " : ""}${result.dealId ? "deal" : ""}`.trim(),
      newValues: {
        companyId: result.companyId,
        contactId: result.contactId,
        dealId: result.dealId,
      },
    });

    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.lead.converted",
        title: `Lead converted: ${fullName}`,
        description: result.dealId
          ? "Converted into a company and a deal"
          : "Converted into a company",
        resourceType: "crm_lead",
        resourceId: lead.id,
        metadata: { companyId: result.companyId, dealId: result.dealId },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.lead.converted):", e);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Convert lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
