import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { inventoryStockAdjustments, inventoryStock, inventoryProducts } from "@/db/schema";
import { inventoryStockAdjustmentSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adjustments = await db.query.inventoryStockAdjustments.findMany({
    where: eq(inventoryStockAdjustments.userId, session.user.id),
    orderBy: (adjustments) => [desc(adjustments.createdAt)],
    with: {
      product: true,
    },
  });

  return NextResponse.json(adjustments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        eq(inventoryProducts.userId, session.user.id)
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
        userId: session.user.id,
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

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error("Create adjustment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
