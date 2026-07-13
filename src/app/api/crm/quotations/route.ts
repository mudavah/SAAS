import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmQuotations, crmQuotationItems, crmCompanies, crmContacts, crmLeads, crmDeals } from "@/db/schema";
import { crmQuotationSchema } from "@/lib/validations";
import { eq, desc, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { generateInvoiceNumber } from "@/lib/utils";

function round2(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.crmQuotations.findMany({
    where: eq(crmQuotations.organizationId, ctx.organizationId),
    orderBy: (q) => [desc(q.createdAt)],
    with: {
      company: { columns: { id: true, name: true } },
      contact: { columns: { id: true, firstName: true, lastName: true } },
      items: true,
      deal: { columns: { id: true, name: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "crm.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const parsed = crmQuotationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const refs = [
      [parsed.data.companyId, crmCompanies],
      [parsed.data.contactId, crmContacts],
      [parsed.data.leadId, crmLeads],
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

    const subtotal = parsed.data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const taxAmount = subtotal * (parsed.data.taxRate / 100);
    const total = subtotal + taxAmount;

    const [quotation] = await db
      .insert(crmQuotations)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        quotationNumber: generateInvoiceNumber("QUO"),
        companyId: parsed.data.companyId || null,
        contactId: parsed.data.contactId || null,
        leadId: parsed.data.leadId || null,
        dealId: parsed.data.dealId || null,
        status: "draft",
        version: 1,
        parentQuotationId: null,
        validUntil: parsed.data.validUntil ?? null,
        currency: parsed.data.currency,
        subtotal: round2(subtotal),
        taxRate: parsed.data.taxRate.toFixed(2),
        taxAmount: round2(taxAmount),
        total: round2(total),
        notes: parsed.data.notes || null,
        terms: parsed.data.terms || null,
        approvalStatus: parsed.data.approvalStatus,
      })
      .returning();

    await db.insert(crmQuotationItems).values(
      parsed.data.items.map((item, index) => ({
        organizationId: ctx.organizationId,
        quotationId: quotation.id,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        amount: (item.quantity * item.unitPrice).toFixed(2),
        sortOrder: index,
      }))
    );

    await logAuditSafe(ctx, {
      action: "crm.quotation.create",
      category: "crm",
      resourceType: "crm_quotation",
      resourceId: quotation.id,
      description: `Created quotation ${quotation.quotationNumber}`,
      newValues: { number: quotation.quotationNumber, total: quotation.total },
    });

    if (quotation.approvalStatus === "pending") {
      await createNotification({
        organizationId: ctx.organizationId,
        category: "crm",
        type: "crm_quotation_pending_approval",
        title: "Quotation needs approval",
        message: `${quotation.quotationNumber} (${quotation.currency} ${quotation.total})`,
        priority: "high",
        deepLink: "/dashboard/crm/quotations",
      });
    }

    try {
      await emitTimelineEvent({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        eventType: "crm.quotation.created",
        title: `Quotation created: ${quotation.quotationNumber}`,
        description: `${quotation.currency} ${quotation.total}`,
        resourceType: "crm_quotation",
        resourceId: quotation.id,
        metadata: { number: quotation.quotationNumber, total: quotation.total },
      });
    } catch (e) {
      console.error("Timeline emit failed (crm.quotation.created):", e);
    }

    const full = await db.query.crmQuotations.findFirst({
      where: eq(crmQuotations.id, quotation.id),
      with: { items: true },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error("Create quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
