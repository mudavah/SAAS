import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { invoiceUpdateSchema } from "@/lib/validations";
import { emitTimelineEvent } from "@/lib/timeline";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "invoices.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.organizationId, ctx.organizationId)),
    with: { client: true, items: true, payments: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "invoices.edit");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;
  const body = await req.json();
  const parsed = invoiceUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  if (typeof updateData.taxRate === "number") {
    updateData.taxRate = updateData.taxRate.toFixed(2);
  }

  const [updated] = await db
    .update(invoices)
    .set(updateData)
    .where(and(eq(invoices.id, id), eq(invoices.organizationId, ctx.organizationId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAuditSafe(ctx, {
    action: "invoice.update",
    category: "invoices",
    resourceType: "invoice",
    resourceId: updated.id,
    description: `Updated invoice ${updated.invoiceNumber}`,
    newValues: parsed.data,
  });

  try {
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "invoice.updated",
      title: `Invoice ${updated.invoiceNumber} updated`,
      description: `Status ${updated.status} · total ${updated.currency} ${updated.total}`,
      resourceType: "invoice",
      resourceId: updated.id,
      metadata: { invoiceNumber: updated.invoiceNumber, status: updated.status },
    });
  } catch (e) {
    console.error("Timeline emit failed (invoice.updated):", e);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "invoices.delete");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "invoice.delete",
    category: "invoices",
    resourceType: "invoice",
    resourceId: id,
    description: `Deleted invoice ${id}`,
  });

  try {
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "invoice.deleted",
      title: `Invoice deleted`,
      description: `Invoice ${id} was deleted`,
      resourceType: "invoice",
      resourceId: id,
    });
  } catch (e) {
    console.error("Timeline emit failed (invoice.deleted):", e);
  }

  return NextResponse.json({ success: true });
}
