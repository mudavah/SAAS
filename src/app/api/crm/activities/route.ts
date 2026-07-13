import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmActivities, crmLeads, crmContacts, crmCompanies, crmDeals } from "@/db/schema";
import { crmActivitySchema } from "@/lib/validations";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const due = searchParams.get("due"); // "overdue" | "today" | "upcoming"
  const where = [eq(crmActivities.organizationId, ctx.organizationId)];

  if (due === "overdue") {
    where.push(sql`${crmActivities.dueDate} < now()`);
    where.push(eq(crmActivities.status, "planned"));
  }

  const rows = await db.query.crmActivities.findMany({
    where: and(...where),
    orderBy: (a) => [desc(a.dueDate), desc(a.createdAt)],
    with: {
      lead: { columns: { id: true, firstName: true, lastName: true } },
      contact: { columns: { id: true, firstName: true, lastName: true } },
      company: { columns: { id: true, name: true } },
      deal: { columns: { id: true, name: true } },
      assigned: { columns: { id: true, name: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.activities.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const parsed = crmActivitySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const refs = [
      [parsed.data.leadId, crmLeads],
      [parsed.data.contactId, crmContacts],
      [parsed.data.companyId, crmCompanies],
      [parsed.data.dealId, crmDeals],
    ] as const;
    for (const [refId, table] of refs) {
      if (refId) {
        const found = await db
          .select({ id: table.id })
          .from(table as any)
          .where(and(eq((table as any).id, refId), eq((table as any).organizationId, ctx.organizationId)))
          .limit(1);
        if (!found) return NextResponse.json({ error: "Referenced record not found" }, { status: 404 });
      }
    }

    const completedAt =
      parsed.data.status === "completed" ? new Date() : null;

    const [activity] = await db
      .insert(crmActivities)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        type: parsed.data.type,
        subject: parsed.data.subject,
        description: parsed.data.description || null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ?? null,
        completedAt,
        remindAt: parsed.data.remindAt ?? null,
        assignedTo: parsed.data.assignedTo || null,
        leadId: parsed.data.leadId || null,
        contactId: parsed.data.contactId || null,
        companyId: parsed.data.companyId || null,
        dealId: parsed.data.dealId || null,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "crm.activity.create",
      category: "crm",
      resourceType: "crm_activity",
      resourceId: activity.id,
      description: `Logged ${activity.type}: ${activity.subject}`,
      newValues: { type: activity.type, subject: activity.subject },
    });

    if (activity.status === "completed") {
      try {
        await emitTimelineEvent({
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          eventType: "crm.activity.completed",
          title: `Activity completed: ${activity.subject}`,
          description: activity.type,
          resourceType: "crm_activity",
          resourceId: activity.id,
        });
      } catch (e) {
        console.error("Timeline emit failed (crm.activity.completed):", e);
      }
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Create activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
