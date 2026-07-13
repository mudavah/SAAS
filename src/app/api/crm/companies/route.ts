import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmCompanies } from "@/db/schema";
import { crmCompanySchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.crmCompanies.findMany({
    where: eq(crmCompanies.organizationId, ctx.organizationId),
    orderBy: (c) => [asc(c.name)],
    with: { contacts: { columns: { id: true } } },
  });

  const result = rows.map((c) => ({
    ...c,
    contactCount: c.contacts.length,
    contacts: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.contacts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = crmCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const [company] = await db
      .insert(crmCompanies)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
        email: parsed.data.email || null,
        website: parsed.data.website || null,
        tags: parsed.data.tags ?? [],
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "crm.company.create",
      category: "crm",
      resourceType: "crm_company",
      resourceId: company.id,
      description: `Created company ${company.name}`,
      newValues: { name: company.name, industry: company.industry },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "crm",
      type: "crm_company_added",
      title: "Company added",
      message: `${company.name} was added to CRM.`,
      deepLink: "/dashboard/crm/companies",
    });

    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.company.created",
        title: `Company added: ${company.name}`,
        resourceType: "crm_company",
        resourceId: company.id,
        metadata: { industry: company.industry },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.company.created):", e);
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Create company error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
