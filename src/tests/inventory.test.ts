/**
 * Inventory module — unit tests
 * ------------------------------------------------------------------
 * Validates the inventory validation schemas (product, category, warehouse,
 * brand, supplier, stock movement, purchase order, stock adjustment). These
 * schemas are the input-sanitization boundary for every Inventory API route,
 * so they are tested directly to guarantee malformed payloads are rejected.
 */
import { describe, it, expect } from "vitest";
import {
  inventoryCategorySchema,
  inventoryBrandSchema,
  inventorySupplierSchema,
  inventoryWarehouseSchema,
  inventoryProductSchema,
  inventoryStockMovementSchema,
  inventoryPurchaseOrderSchema,
  inventoryStockAdjustmentSchema,
} from "@/lib/validations";

describe("inventoryCategorySchema", () => {
  it("requires a name", () => {
    expect(inventoryCategorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(inventoryCategorySchema.safeParse({ name: "Raw Materials" }).success).toBe(true);
  });
  it("defaults type to product", () => {
    expect(inventoryCategorySchema.parse({ name: "X" }).type).toBe("product");
  });
});

describe("inventoryProductSchema", () => {
  it("requires a name and a non-negative selling price", () => {
    expect(inventoryProductSchema.safeParse({ name: "", sellingPrice: 100 }).success).toBe(false);
    expect(inventoryProductSchema.safeParse({ name: "Widget", sellingPrice: -5 }).success).toBe(false);
  });

  it("accepts a valid product", () => {
    expect(
      inventoryProductSchema.safeParse({
        name: "Widget",
        sku: "W-1",
        sellingPrice: 100,
        trackInventory: true,
      }).success
    ).toBe(true);
  });

  it("treats sku/barcode as optional", () => {
    expect(inventoryProductSchema.safeParse({ name: "Widget", sellingPrice: 50 }).success).toBe(true);
  });
});

describe("inventoryStockMovementSchema", () => {
  it("requires productId, warehouseId, type and quantity", () => {
    expect(
      inventoryStockMovementSchema.safeParse({
        productId: "p-1",
        warehouseId: "w-1",
        type: "sale",
        quantity: 5,
      }).success
    ).toBe(true);
    expect(inventoryStockMovementSchema.safeParse({ quantity: 5 }).success).toBe(false);
    expect(inventoryStockMovementSchema.safeParse({ productId: "p-1", warehouseId: "w-1", type: "bogus", quantity: 1 }).success).toBe(false);
  });
});

describe("inventoryPurchaseOrderSchema", () => {
  it("requires a valid order date and at least one item", () => {
    expect(inventoryPurchaseOrderSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      inventoryPurchaseOrderSchema.safeParse({
        orderDate: "2026-01-01",
        items: [{ productId: "p-1", quantity: 2, unitCost: 50 }],
      }).success
    ).toBe(true);
  });
  it("rejects a non-positive item quantity", () => {
    expect(
      inventoryPurchaseOrderSchema.safeParse({
        orderDate: "2026-01-01",
        items: [{ productId: "p-1", quantity: 0, unitCost: 50 }],
      }).success
    ).toBe(false);
  });
});

describe("inventoryStockAdjustmentSchema", () => {
  it("requires product, warehouse and a reason", () => {
    expect(
      inventoryStockAdjustmentSchema.safeParse({ productId: "p-1", warehouseId: "w-1", quantity: -3, reason: "shrinkage" })
        .success
    ).toBe(true);
    expect(inventoryStockAdjustmentSchema.safeParse({ productId: "p-1", warehouseId: "w-1", quantity: -3 }).success).toBe(false);
  });
});

describe("inventorySupplierSchema / warehouseSchema / brandSchema", () => {
  it("supplier requires a name", () => {
    expect(inventorySupplierSchema.safeParse({ name: "Acme" }).success).toBe(true);
    expect(inventorySupplierSchema.safeParse({}).success).toBe(false);
  });
  it("warehouse requires name", () => {
    expect(inventoryWarehouseSchema.safeParse({ name: "Main" }).success).toBe(true);
  });
  it("brand requires a name", () => {
    expect(inventoryBrandSchema.safeParse({ name: "Nike" }).success).toBe(true);
  });
});
