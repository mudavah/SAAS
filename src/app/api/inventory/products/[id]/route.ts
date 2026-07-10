import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryProducts, inventoryStock, inventoryCategories, inventoryBrands } from "@/db/schema";
import { inventoryProductSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  const product = await db.query.inventoryProducts.findFirst({
    where: and(eq(inventoryProducts.id, id), eq(inventoryProducts.organizationId, ctx.organizationId)),
    with: {
      category: true,
      brand: true,
      stock: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "inventory.products.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;
  const body = await req.json();
  const parsed = inventoryProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(inventoryProducts)
    .set({
      name: parsed.data.name,
      sellingPrice: parsed.data.sellingPrice.toString(),
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
      ...(parsed.data.categoryId && { categoryId: parsed.data.categoryId }),
      ...(parsed.data.brandId && { brandId: parsed.data.brandId }),
      ...(parsed.data.sku !== undefined && { sku: parsed.data.sku || null }),
      ...(parsed.data.barcode !== undefined && { barcode: parsed.data.barcode || null }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.costPrice !== undefined && { costPrice: parsed.data.costPrice.toString() }),
      ...(parsed.data.unit && { unit: parsed.data.unit }),
      ...(parsed.data.minStockLevel !== undefined && { minStockLevel: parsed.data.minStockLevel }),
      ...(parsed.data.maxStockLevel !== undefined && { maxStockLevel: parsed.data.maxStockLevel }),
      ...(parsed.data.reorderPoint !== undefined && { reorderPoint: parsed.data.reorderPoint }),
    })
    .where(and(eq(inventoryProducts.id, id), eq(inventoryProducts.organizationId, ctx.organizationId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAuditSafe(ctx, {
    action: "inventory_product.update",
    category: "inventory",
    resourceType: "inventory_product",
    resourceId: updated.id,
    description: `Updated inventory product ${updated.name}`,
    newValues: { name: updated.name, sku: updated.sku },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "inventory.products.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  await db
    .delete(inventoryProducts)
    .where(and(eq(inventoryProducts.id, id), eq(inventoryProducts.organizationId, ctx.organizationId)));

  await logAuditSafe(ctx, {
    action: "inventory_product.delete",
    category: "inventory",
    resourceType: "inventory_product",
    resourceId: id,
    description: `Deleted inventory product ${id}`,
  });

  return NextResponse.json({ success: true });
}
