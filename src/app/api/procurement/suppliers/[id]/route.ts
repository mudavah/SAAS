import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventorySuppliers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.suppliers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const supplier = await db.query.inventorySuppliers.findFirst({
    where: and(eq(inventorySuppliers.id, id), eq(inventorySuppliers.organizationId, ctx.organizationId)),
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.suppliers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const supplier = await db.query.inventorySuppliers.findFirst({
    where: and(eq(inventorySuppliers.id, id), eq(inventorySuppliers.organizationId, ctx.organizationId)),
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  try {
    const body = await req.json();
    const [updated] = await db
      .update(inventorySuppliers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(inventorySuppliers.id, id))
      .returning();

    await logAuditSafe(ctx, {
      action: "procurement.supplier.update",
      category: "purchasing",
      resourceType: "inventory_supplier",
      resourceId: id,
      description: `Updated supplier ${updated.name}`,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update supplier error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.suppliers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  await db.delete(inventorySuppliers).where(eq(inventorySuppliers.id, id));
  await logAuditSafe(ctx, {
    action: "procurement.supplier.delete",
    category: "purchasing",
    resourceType: "inventory_supplier",
    resourceId: id,
    description: "Deleted supplier",
  });
  return NextResponse.json({ success: true });
}
