import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  inventoryPurchaseOrders,
  inventoryPurchaseOrderItems,
  inventoryStockMovements,
  inventoryStock,
  inventoryProducts,
  inventorySuppliers,
} from "@/db/schema";
import { inventoryPurchaseOrderSchema } from "@/lib/validations";
import { eq, and, asc, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db.query.inventoryPurchaseOrders.findMany({
    where: eq(inventoryPurchaseOrders.userId, session.user.id),
    orderBy: (orders) => [desc(orders.createdAt)],
    with: {
      supplier: true,
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = inventoryPurchaseOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [order] = await db
      .insert(inventoryPurchaseOrders)
      .values({
        userId: session.user.id,
        supplierId: parsed.data.supplierId || null,
        status: parsed.data.status,
        orderDate: parsed.data.orderDate,
        expectedDate: parsed.data.expectedDate || null,
        notes: parsed.data.notes || null,
      })
      .returning();

    const items = parsed.data.items.map((item) => ({
      purchaseOrderId: order.id,
      productId: item.productId,
      quantity: item.quantity.toString(),
      unitCost: item.unitCost.toString(),
      receivedQuantity: "0",
    }));

    await db.insert(inventoryPurchaseOrderItems).values(items);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Create purchase order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
