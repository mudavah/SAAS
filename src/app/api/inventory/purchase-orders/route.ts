import { NextResponse } from "next/server";
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
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const orders = await db.query.inventoryPurchaseOrders.findMany({
    where: eq(inventoryPurchaseOrders.organizationId, ctx.organizationId),
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
  const res = await requireApiContext(req, "purchasing.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

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
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        supplierId: parsed.data.supplierId || null,
        status: parsed.data.status,
        orderDate: parsed.data.orderDate,
        expectedDate: parsed.data.expectedDate || null,
        notes: parsed.data.notes || null,
      })
      .returning();

    // Validate that the referenced supplier (if any) and every line-item product
    // belong to this organization before persisting.
    if (parsed.data.supplierId) {
      const supplier = await db.query.inventorySuppliers.findFirst({
        where: and(
          eq(inventorySuppliers.id, parsed.data.supplierId),
          eq(inventorySuppliers.organizationId, ctx.organizationId)
        ),
        columns: { id: true },
      });
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
    }

    const productIds = parsed.data.items.map((i) => i.productId);
    const validProducts = await db.query.inventoryProducts.findMany({
      where: and(
        eq(inventoryProducts.organizationId, ctx.organizationId)
      ),
      columns: { id: true },
    });
    const validProductIds = new Set(validProducts.map((p) => p.id));
    const invalidProduct = parsed.data.items.find(
      (i) => !validProductIds.has(i.productId)
    );
    if (invalidProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const items = parsed.data.items.map((item) => ({
      organizationId: ctx.organizationId,
      purchaseOrderId: order.id,
      productId: item.productId,
      quantity: item.quantity.toString(),
      unitCost: item.unitCost.toString(),
      receivedQuantity: "0",
    }));

    await db.insert(inventoryPurchaseOrderItems).values(items);

    await logAuditSafe(ctx, {
      action: "inventory_purchase_order.create",
      category: "purchasing",
      resourceType: "inventory_purchase_order",
      resourceId: order.id,
      description: `Created purchase order ${order.id}`,
      newValues: { status: order.status, supplierId: order.supplierId },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    logger.error("Create purchase order error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
