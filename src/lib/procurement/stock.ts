/**
 * KaziFlow — Procurement / Inventory integration
 * ------------------------------------------------------------------
 * Applies physical stock changes from goods received / supplier returns.
 * Upserts `inventory_stock` (one row per product+warehouse) and records an
 * immutable `inventory_stock_movements` row for traceability.
 */
import { db } from "@/db";
import {
  inventoryStock,
  inventoryStockMovements,
  stockMovementTypeEnum,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Apply a signed delta to a product's stock in a warehouse.
 * `delta` positive = increase (receipt), negative = decrease (return).
 */
export async function applyStockDelta(params: {
  organizationId: string;
  userId: string;
  productId: string;
  warehouseId: string;
  delta: number;
  type: (typeof stockMovementTypeEnum.enumValues)[number];
  referenceId: string;
  referenceType: string;
  notes?: string;
}): Promise<void> {
  // Upsert stock row.
  const existing = await db.query.inventoryStock.findFirst({
    where: and(
      eq(inventoryStock.productId, params.productId),
      eq(inventoryStock.warehouseId, params.warehouseId)
    ),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(inventoryStock)
      .set({
        quantity: sql`${inventoryStock.quantity} + ${params.delta}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryStock.id, existing.id));
  } else {
    await db.insert(inventoryStock).values({
      organizationId: params.organizationId,
      userId: params.userId,
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.delta.toString(),
      reservedQuantity: "0",
      avgCost: "0",
    });
  }

  await db.insert(inventoryStockMovements).values({
    organizationId: params.organizationId,
    userId: params.userId,
    productId: params.productId,
    warehouseId: params.warehouseId,
    type: params.type,
    quantity: params.delta.toString(),
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    notes: params.notes ?? null,
  });
}

/** Increase stock on goods received. */
export async function applyStockReceipt(params: {
  organizationId: string;
  userId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  referenceId: string;
  notes?: string;
}): Promise<void> {
  await applyStockDelta({
    ...params,
    delta: params.quantity,
    type: "purchase",
    referenceType: "procurement_grn",
  });
}

/** Decrease stock on supplier return. */
export async function applyStockReturn(params: {
  organizationId: string;
  userId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  referenceId: string;
  notes?: string;
}): Promise<void> {
  await applyStockDelta({
    ...params,
    delta: -Math.abs(params.quantity),
    type: "return",
    referenceType: "procurement_return",
  });
}
