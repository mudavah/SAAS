import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStockAdjustments, inventoryStock, inventoryProducts } from "@/db/schema";
import { inventoryStockAdjustmentSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const adjustments = await db.query.inventoryStockAdjustments.findMany({
    where: eq(inventoryStockAdjustments.organizationId, ctx.organizationId),
    orderBy: (adjustments) => [desc(adjustments.createdAt)],
    with: {
      product: true,
    },
  });

  return NextResponse.json(adjustments);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.stock.adjust");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventoryStockAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const productResult = await db.query.inventoryProducts.findFirst({
      where: and(
        eq(inventoryProducts.id, parsed.data.productId),
        eq(inventoryProducts.organizationId, ctx.organizationId)
      ),
      with: { stock: true },
    });

    if (!productResult) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const quantityNum = parseFloat(parsed.data.quantity.toString());
    const stockQty = productResult.stock?.length ? parseFloat(productResult.stock[0].quantity || "0") : 0;
    const newStockQty = stockQty + quantityNum;
    const finalQty = Math.max(0, newStockQty);

    const [adjustment] = await db
      .insert(inventoryStockAdjustments)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        productId: parsed.data.productId,
        warehouseId: parsed.data.warehouseId,
        quantity: parsed.data.quantity.toString(),
        reason: parsed.data.reason,
      })
      .returning();

    const stockResult = await db.query.inventoryStock.findFirst({
      where: and(
        eq(inventoryStock.productId, parsed.data.productId),
        eq(inventoryStock.warehouseId, parsed.data.warehouseId)
      ),
    });

    if (stockResult) {
      await db
        .update(inventoryStock)
        .set({ quantity: finalQty.toFixed(2), updatedAt: new Date() })
        .where(eq(inventoryStock.id, stockResult.id));
    }

    await logAuditSafe(ctx, {
      action: "inventory_stock_adjustment.create",
      category: "inventory",
      resourceType: "inventory_stock_adjustment",
      resourceId: adjustment.id,
      description: `Adjusted stock for ${productResult.name} by ${parsed.data.quantity}`,
      newValues: { productId: parsed.data.productId, quantity: parsed.data.quantity, finalQuantity: finalQty.toFixed(2) },
    });

    const minStockLevel = productResult.minStockLevel || 0;
    if (finalQty <= minStockLevel) {
      await createNotification({
        organizationId: ctx.organizationId,
        category: "inventory",
        type: "low_stock",
        title: "Low stock alert",
        message: `Stock for ${productResult.name} is low.`,
        priority: "high",
        deepLink: "/dashboard/inventory/products",
      });
    }

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error("Create adjustment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
