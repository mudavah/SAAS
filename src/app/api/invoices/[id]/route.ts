import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
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

  const [updated] = await db
    .update(invoices)
    .set({ ...body, updatedAt: new Date() })
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
    newValues: body,
  });

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

  return NextResponse.json({ success: true });
}
