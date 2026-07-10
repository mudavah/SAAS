import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStockMovements, inventoryStock, inventoryProducts } from "@/db/schema";
import { inventoryStockMovementSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const movements = await db.query.inventoryStockMovements.findMany({
    where: eq(inventoryStockMovements.organizationId, ctx.organizationId),
    orderBy: (movements) => [desc(movements.createdAt)],
    with: {
      product: true,
    },
  });

  return NextResponse.json(movements);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.stock.adjust");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventoryStockMovementSchema.safeParse(body);

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
    });

    if (!productResult) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const quantityNum = parseFloat(parsed.data.quantity.toString());
    const movementType = parsed.data.type;

    let quantityChange = quantityNum;
    if (["sale", "damage", "adjustment"].includes(movementType) && quantityNum > 0) {
      quantityChange = -quantityNum;
    } else if (["purchase", "return"].includes(movementType) && quantityNum < 0) {
      quantityChange = Math.abs(quantityNum);
    }

    const [movement] = await db
      .insert(inventoryStockMovements)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        productId: parsed.data.productId,
        warehouseId: parsed.data.warehouseId,
        type: parsed.data.type,
        quantity: parsed.data.quantity.toString(),
        referenceId: parsed.data.referenceId || null,
        referenceType: parsed.data.referenceType || null,
        notes: parsed.data.notes || null,
      })
      .returning();

    const stockResult = await db.query.inventoryStock.findFirst({
      where: and(
        eq(inventoryStock.organizationId, ctx.organizationId),
        eq(inventoryStock.productId, parsed.data.productId),
        eq(inventoryStock.warehouseId, parsed.data.warehouseId)
      ),
    });

    if (stockResult) {
      const newQty = parseFloat(stockResult.quantity) + quantityChange;
      await db
        .update(inventoryStock)
        .set({ quantity: Math.max(0, newQty).toFixed(2), updatedAt: new Date() })
        .where(eq(inventoryStock.id, stockResult.id));
    }

    await logAuditSafe(ctx, {
      action: "inventory_stock_movement.create",
      category: "inventory",
      resourceType: "inventory_stock_movement",
      resourceId: movement.id,
      description: `Recorded stock movement ${parsed.data.type} for ${productResult.name}`,
      newValues: { productId: parsed.data.productId, type: parsed.data.type, quantity: parsed.data.quantity },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("Create stock movement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
