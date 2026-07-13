import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmContacts, crmCompanies } from "@/db/schema";
import { crmContactSchema } from "@/lib/validations";
import { eq, asc, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const rows = await db.query.crmContacts.findMany({
    where: companyId
      ? and(eq(crmContacts.organizationId, ctx.organizationId), eq(crmContacts.companyId, companyId))
      : eq(crmContacts.organizationId, ctx.organizationId),
    orderBy: (c) => [asc(c.firstName)],
    with: { company: { columns: { id: true, name: true } } },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.contacts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = crmContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    if (parsed.data.companyId) {
      const company = await db.query.crmCompanies.findFirst({
        where: and(
          eq(crmCompanies.id, parsed.data.companyId),
          eq(crmCompanies.organizationId, ctx.organizationId)
        ),
        columns: { id: true },
      });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
    }

    // If this contact is primary, demote any existing primary for the company.
    if (parsed.data.isPrimary && parsed.data.companyId) {
      await db
        .update(crmContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(crmContacts.organizationId, ctx.organizationId),
            eq(crmContacts.companyId, parsed.data.companyId),
            eq(crmContacts.isPrimary, true)
          )
        );
    }

    const [contact] = await db
      .insert(crmContacts)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        companyId: parsed.data.companyId || null,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        jobTitle: parsed.data.jobTitle || null,
        department: parsed.data.department || null,
        isPrimary: parsed.data.isPrimary,
        notes: parsed.data.notes || null,
        tags: parsed.data.tags ?? [],
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "crm.contact.create",
      category: "crm",
      resourceType: "crm_contact",
      resourceId: contact.id,
      description: `Created contact ${contact.firstName} ${contact.lastName ?? ""}`.trim(),
      newValues: { name: contact.firstName, companyId: contact.companyId },
    });

    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.contact.created",
        title: `Contact added: ${contact.firstName} ${contact.lastName ?? ""}`.trim(),
        resourceType: "crm_contact",
        resourceId: contact.id,
        metadata: { companyId: contact.companyId },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.contact.created):", e);
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
