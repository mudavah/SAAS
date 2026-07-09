import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { inventoryStockMovements, inventoryStock, inventoryProducts } from "@/db/schema";
import { inventoryStockMovementSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const movements = await db.query.inventoryStockMovements.findMany({
    where: eq(inventoryStockMovements.userId, session.user.id),
    orderBy: (movements) => [desc(movements.createdAt)],
    with: {
      product: true,
    },
  });

  return NextResponse.json(movements);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        eq(inventoryProducts.userId, session.user.id)
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
        userId: session.user.id,
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

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("Create stock movement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
