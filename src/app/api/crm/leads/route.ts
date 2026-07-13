import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmLeads } from "@/db/schema";
import { crmLeadSchema } from "@/lib/validations";
import { eq, desc, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { scoreLead } from "@/lib/crm/scoring";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.crmLeads.findMany({
    where: eq(crmLeads.organizationId, ctx.organizationId),
    orderBy: (l) => [desc(l.score), desc(l.createdAt)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.leads.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = crmLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { score, reasons } = scoreLead({
      source: parsed.data.source,
      status: parsed.data.status,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      estimatedValue: parsed.data.estimatedValue,
      tags: parsed.data.tags,
    });

    const [lead] = await db
      .insert(crmLeads)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
        email: parsed.data.email || null,
        assignedTo: parsed.data.assignedTo || null,
        score,
        scoreReasons: reasons,
        tags: parsed.data.tags ?? [],
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "crm.lead.create",
      category: "crm",
      resourceType: "crm_lead",
      resourceId: lead.id,
      description: `Created lead ${lead.firstName} ${lead.lastName ?? ""}`.trim(),
      newValues: { name: lead.firstName, score: lead.score, source: lead.source },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "crm",
      type: "crm_lead_added",
      title: "New lead captured",
      message: `${lead.firstName} ${lead.lastName ?? ""} (score ${score})`.trim(),
      priority: score >= 70 ? "high" : "normal",
      deepLink: "/dashboard/crm/leads",
    });

    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.lead.created",
        title: `Lead captured: ${lead.firstName} ${lead.lastName ?? ""}`.trim(),
        description: `Source: ${lead.source} · Score: ${score}`,
        resourceType: "crm_lead",
        resourceId: lead.id,
        metadata: { source: lead.source, score },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.lead.created):", e);
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
