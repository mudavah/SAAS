import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmLeads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { crmLeadSchema } from "@/lib/validations";
import { scoreLead } from "@/lib/crm/scoring";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const lead = await db.query.crmLeads.findFirst({
    where: and(eq(crmLeads.id, id), eq(crmLeads.organizationId, ctx.organizationId)),
    with: { convertedCompany: true, convertedContact: true, convertedDeal: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.leads.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const body = await req.json();
  const parsed = crmLeadSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmLeads.findFirst({
    where: and(eq(crmLeads.id, id), eq(crmLeads.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.email === "") data.email = null;
  if (parsed.data.assignedTo === "") data.assignedTo = null;
  if (parsed.data.tags) data.tags = parsed.data.tags;

  // Recompute the lead score whenever a scoring-relevant field changes.
  const scoringFields = ["source", "status", "email", "phone", "company", "estimatedValue", "tags"];
  if (scoringFields.some((f) => f in parsed.data)) {
    const merged = {
      source: parsed.data.source ?? existing.source,
      status: parsed.data.status ?? existing.status,
      email: parsed.data.email ?? existing.email,
      phone: parsed.data.phone ?? existing.phone,
      company: parsed.data.company ?? existing.company,
      estimatedValue: parsed.data.estimatedValue ?? existing.estimatedValue,
      tags: parsed.data.tags ?? existing.tags,
    };
    const { score, reasons } = scoreLead(merged);
    data.score = score;
    data.scoreReasons = reasons;
  }

  const [updated] = await db
    .update(crmLeads)
    .set(data)
    .where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.lead.update",
    category: "crm",
    resourceType: "crm_lead",
    resourceId: updated.id,
    description: `Updated lead ${updated.firstName}`,
    newValues: parsed.data,
  });

  try {
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "crm.lead.updated",
      title: `Lead updated: ${updated.firstName} ${updated.lastName ?? ""}`.trim(),
      description: `Status: ${updated.status} · Score: ${updated.score}`,
      resourceType: "crm_lead",
      resourceId: updated.id,
      metadata: { status: updated.status, score: updated.score },
    });
  } catch (e) {
    console.error("Timeline emit failed (crm.lead.updated):", e);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
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
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(crmLeads)
    .where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.lead.delete",
    category: "crm",
    resourceType: "crm_lead",
    resourceId: id,
    description: `Deleted lead ${lead.firstName}`,
    oldValues: { name: lead.firstName, email: lead.email },
  });

  return NextResponse.json({ success: true });
}
