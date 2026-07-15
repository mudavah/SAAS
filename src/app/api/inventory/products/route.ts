import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  inventoryProducts,
  inventoryStock,
  inventoryCategories,
  inventoryBrands,
  inventoryWarehouses,
} from "@/db/schema";
import { inventoryProductSchema } from "@/lib/validations";
import { eq, asc, desc, and, sql, SQL } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const brandId = searchParams.get("brandId");
  const search = searchParams.get("search");
  const lowStock = searchParams.get("lowStock");

  const whereClauses: SQL[] = [eq(inventoryProducts.organizationId, ctx.organizationId)];

  if (categoryId) {
    whereClauses.push(eq(inventoryProducts.categoryId, categoryId));
  }
  if (brandId) {
    whereClauses.push(eq(inventoryProducts.brandId, brandId));
  }
  if (search) {
    whereClauses.push(
      sql`${inventoryProducts.name} ILIKE ${`%${search}%`} OR ${inventoryProducts.sku} ILIKE ${`%${search}%`}`
    );
  }

  const products = await db.query.inventoryProducts.findMany({
    where: and(...whereClauses),
    orderBy: (products) => [desc(products.createdAt)],
    with: {
      category: true,
      brand: true,
      stock: true,
    },
  });

  let filtered = products;
  if (lowStock === "true") {
    filtered = products.filter((p) => {
      const qty = parseFloat(p.stock?.[0]?.quantity || "0");
      const min = p.minStockLevel || 0;
      return qty <= min;
    });
  }

  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.products.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventoryProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const values: Record<string, unknown> = {
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name: parsed.data.name,
      sellingPrice: parsed.data.sellingPrice.toString(),
      isActive: parsed.data.isActive,
    };

    // Validate any referenced category/brand belongs to this organization.
    if (parsed.data.categoryId) {
      const cat = await db.query.inventoryCategories.findFirst({
        where: and(
          eq(inventoryCategories.id, parsed.data.categoryId),
          eq(inventoryCategories.organizationId, ctx.organizationId)
        ),
        columns: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      values.categoryId = parsed.data.categoryId;
    }
    if (parsed.data.brandId) {
      const brand = await db.query.inventoryBrands.findFirst({
        where: and(
          eq(inventoryBrands.id, parsed.data.brandId),
          eq(inventoryBrands.organizationId, ctx.organizationId)
        ),
        columns: { id: true },
      });
      if (!brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
      values.brandId = parsed.data.brandId;
    }
    if (parsed.data.sku !== undefined) values.sku = parsed.data.sku || null;
    if (parsed.data.barcode !== undefined) values.barcode = parsed.data.barcode || null;
    if (parsed.data.description !== undefined) values.description = parsed.data.description || null;
    if (parsed.data.costPrice !== undefined) values.costPrice = parsed.data.costPrice.toString();
    if (parsed.data.unit) values.unit = parsed.data.unit;
    if (parsed.data.minStockLevel !== undefined) values.minStockLevel = parsed.data.minStockLevel;
    if (parsed.data.maxStockLevel !== undefined) values.maxStockLevel = parsed.data.maxStockLevel;
    if (parsed.data.reorderPoint !== undefined) values.reorderPoint = parsed.data.reorderPoint;

    const [product] = await db
      .insert(inventoryProducts)
      .values(values as any)
      .returning();

    const warehouseResult = await db.query.inventoryWarehouses.findFirst({
      where: eq(inventoryWarehouses.organizationId, ctx.organizationId),
    });

    if (warehouseResult) {
      await db.insert(inventoryStock).values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        productId: product.id,
        warehouseId: warehouseResult.id,
        quantity: "0",
        reservedQuantity: "0",
        avgCost: (parsed.data.costPrice || 0).toString(),
      });
    }

    await logAuditSafe(ctx, {
      action: "inventory_product.create",
      category: "inventory",
      resourceType: "inventory_product",
      resourceId: product.id,
      description: `Created inventory product ${product.name}`,
      newValues: { name: product.name, sku: product.sku },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    logger.error("Create product error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
