import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmContacts, crmCompanies } from "@/db/schema";
import { crmContactSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const contact = await db.query.crmContacts.findFirst({
    where: and(eq(crmContacts.id, id), eq(crmContacts.organizationId, ctx.organizationId)),
    with: { company: true, activities: { orderBy: (a: any) => [a.desc(a.createdAt)] } },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.contacts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = crmContactSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmContacts.findFirst({
    where: and(eq(crmContacts.id, id), eq(crmContacts.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.companyId) {
    const company = await db.query.crmCompanies.findFirst({
      where: and(
        eq(crmCompanies.id, parsed.data.companyId),
        eq(crmCompanies.organizationId, ctx.organizationId)
      ),
      columns: { id: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

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

  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.email === "") data.email = null;
  if (parsed.data.companyId === "") data.companyId = null;
  if (parsed.data.tags) data.tags = parsed.data.tags;

  const [updated] = await db
    .update(crmContacts)
    .set(data)
    .where(and(eq(crmContacts.id, id), eq(crmContacts.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.contact.update",
    category: "crm",
    resourceType: "crm_contact",
    resourceId: updated.id,
    description: `Updated contact ${updated.firstName}`,
    newValues: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.contacts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const contact = await db.query.crmContacts.findFirst({
    where: and(eq(crmContacts.id, id), eq(crmContacts.organizationId, ctx.organizationId)),
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(crmContacts)
    .where(and(eq(crmContacts.id, id), eq(crmContacts.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.contact.delete",
    category: "crm",
    resourceType: "crm_contact",
    resourceId: id,
    description: `Deleted contact ${contact.firstName}`,
    oldValues: { name: contact.firstName },
  });

  return NextResponse.json({ success: true });
}
