import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmQuotations, crmQuotationItems } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { z } from "zod";
import { generateInvoiceNumber } from "@/lib/utils";

function round2(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

const quotationUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]).optional(),
  approvalStatus: z.enum(["not_required", "pending", "approved", "rejected"]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  currency: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const quotation = await db.query.crmQuotations.findFirst({
    where: and(eq(crmQuotations.id, id), eq(crmQuotations.organizationId, ctx.organizationId)),
    with: { items: true, company: true, contact: true, deal: true, parent: true },
  });
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quotation);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = quotationUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const existing = await db.query.crmQuotations.findFirst({
    where: and(eq(crmQuotations.id, id), eq(crmQuotations.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Item changes create a new versioned revision (keeps full version history).
  if (parsed.data.items && parsed.data.items.length > 0) {
    return reviseQuotation(ctx, existing, parsed.data);
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.approvalStatus) data.approvalStatus = parsed.data.approvalStatus;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.terms !== undefined) data.terms = parsed.data.terms;
  if (parsed.data.validUntil !== undefined) data.validUntil = parsed.data.validUntil;
  if (parsed.data.currency) data.currency = parsed.data.currency;

  if (parsed.data.taxRate !== undefined) {
    const subtotal = Number(existing.subtotal);
    const tax = subtotal * (parsed.data.taxRate / 100);
    data.taxRate = parsed.data.taxRate.toFixed(2);
    data.taxAmount = round2(tax);
    data.total = round2(subtotal + tax);
  }

  const [updated] = await db
    .update(crmQuotations)
    .set(data)
    .where(and(eq(crmQuotations.id, id), eq(crmQuotations.organizationId, ctx.organizationId)))
    .returning();

  await logAuditSafe(ctx, {
    action: "crm.quotation.update",
    category: "crm",
    resourceType: "crm_quotation",
    resourceId: updated.id,
    description: `Updated quotation ${updated.quotationNumber}`,
    newValues: parsed.data,
  });

  return NextResponse.json(updated);
}

async function reviseQuotation(
  ctx: import("@/lib/session").ServerContext,
  existing: typeof crmQuotations.$inferSelect,
  data: z.infer<typeof quotationUpdateSchema>
) {
  const items = data.items!;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxRate = data.taxRate ?? Number(existing.taxRate);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const [maxVersion] = await db
    .select({ v: sql<number>`coalesce(max(${crmQuotations.version}),0)` })
    .from(crmQuotations)
    .where(
      and(
        eq(crmQuotations.organizationId, ctx.organizationId),
        sql`${crmQuotations.id} = ${existing.id} OR ${crmQuotations.parentQuotationId} = ${existing.id}`
      )
    );

  const [revision] = await db
    .insert(crmQuotations)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      quotationNumber: generateInvoiceNumber("QUO"),
      companyId: existing.companyId,
      contactId: existing.contactId,
      leadId: existing.leadId,
      dealId: existing.dealId,
      status: "draft",
      version: (Number(maxVersion?.v ?? existing.version) + 1),
      parentQuotationId: existing.id,
      validUntil: data.validUntil ?? existing.validUntil,
      currency: data.currency ?? existing.currency,
      subtotal: round2(subtotal),
      taxRate: taxRate.toFixed(2),
      taxAmount: round2(tax),
      total: round2(total),
      notes: data.notes ?? existing.notes,
      terms: data.terms ?? existing.terms,
      approvalStatus: "not_required",
    })
    .returning();

  await db.insert(crmQuotationItems).values(
    items.map((item, index) => ({
      organizationId: ctx.organizationId,
      quotationId: revision.id,
      description: item.description,
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      amount: (item.quantity * item.unitPrice).toFixed(2),
      sortOrder: index,
    }))
  );

  await logAuditSafe(ctx, {
    action: "crm.quotation.revise",
    category: "crm",
    resourceType: "crm_quotation",
    resourceId: revision.id,
    description: `Revised quotation → v${revision.version} (${revision.quotationNumber})`,
    newValues: { version: revision.version, parentId: existing.id, total: revision.total },
  });

  const full = await db.query.crmQuotations.findFirst({
    where: eq(crmQuotations.id, revision.id),
    with: { items: true },
  });
  return NextResponse.json(full, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "crm.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const quotation = await db.query.crmQuotations.findFirst({
    where: and(eq(crmQuotations.id, id), eq(crmQuotations.organizationId, ctx.organizationId)),
  });
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quotation.status === "converted") {
    return NextResponse.json({ error: "Cannot delete a converted quotation" }, { status: 409 });
  }

  await db
    .delete(crmQuotations)
    .where(and(eq(crmQuotations.id, id), eq(crmQuotations.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "crm.quotation.delete",
    category: "crm",
    resourceType: "crm_quotation",
    resourceId: id,
    description: `Deleted quotation ${quotation.quotationNumber}`,
  });

  return NextResponse.json({ success: true });
}
