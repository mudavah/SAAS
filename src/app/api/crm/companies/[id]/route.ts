import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmCompanies } from "@/db/schema";
import { crmCompanySchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const company = await db.query.crmCompanies.findFirst({
    where: and(eq(crmCompanies.id, id), eq(crmCompanies.organizationId, ctx.organizationId)),
    with: { contacts: true },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.contacts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = crmCompanySchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmCompanies.findFirst({
    where: and(eq(crmCompanies.id, id), eq(crmCompanies.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.email === "") data.email = null;
  if (parsed.data.website === "") data.website = null;
  if (parsed.data.tags) data.tags = parsed.data.tags;

  const [updated] = await db
    .update(crmCompanies)
    .set(data)
    .where(and(eq(crmCompanies.id, id), eq(crmCompanies.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.company.update",
    category: "crm",
    resourceType: "crm_company",
    resourceId: updated.id,
    description: `Updated company ${updated.name}`,
    newValues: parsed.data,
  });

  try {
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "crm.company.updated",
      title: `Company updated: ${updated.name}`,
      resourceType: "crm_company",
      resourceId: updated.id,
    });
  } catch (e) {
    console.error("Timeline emit failed (crm.company.updated):", e);
  }

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

  const company = await db.query.crmCompanies.findFirst({
    where: and(eq(crmCompanies.id, id), eq(crmCompanies.organizationId, ctx.organizationId)),
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(crmCompanies)
    .where(and(eq(crmCompanies.id, id), eq(crmCompanies.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.company.delete",
    category: "crm",
    resourceType: "crm_company",
    resourceId: id,
    description: `Deleted company ${company.name}`,
    oldValues: { name: company.name },
  });

  return NextResponse.json({ success: true });
}
