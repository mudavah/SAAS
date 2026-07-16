/**
 * POS module — unit tests
 * ------------------------------------------------------------------
 * Exercises the pure POS pricing/totals logic and the request validation
 * schemas (order, order item, payment, return, session). This guards the
 * math used by `completeOrder` and the input boundary for every POS route
 * without requiring a live checkout database.
 */
import { describe, it, expect } from "vitest";
import { computeLineTotals } from "@/lib/pos/service";
import {
  posOrderSchema,
  posOrderItemSchema,
  posPaymentSchema,
  posReturnSchema,
  posSessionSchema,
} from "@/lib/validations";

describe("computeLineTotals", () => {
  it("applies the default 16% VAT", () => {
    const t = computeLineTotals([{ quantity: 10, unitPrice: 100 }]);
    expect(t.subtotal).toBe(1000);
    expect(t.taxAmount).toBe(160);
    expect(t.total).toBe(1160);
  });

  it("subtracts line discounts before tax", () => {
    const t = computeLineTotals([{ quantity: 2, unitPrice: 100, discount: 50 }]);
    // (2 * (100 - 50)) = 100 base; 16% = 16
    expect(t.subtotal).toBe(100);
    expect(t.taxAmount).toBe(16);
    expect(t.total).toBe(116);
  });

  it("honours a per-line tax rate override", () => {
    const t = computeLineTotals([{ quantity: 1, unitPrice: 200, taxRate: 8 }]);
    expect(t.taxAmount).toBe(16);
    expect(t.total).toBe(216);
  });
});

describe("posOrderItemSchema", () => {
  it("rejects zero/negative quantity", () => {
    expect(posOrderItemSchema.safeParse({ productId: "p1", quantity: 0, unitPrice: 10 }).success).toBe(false);
  });
  it("accepts a valid item", () => {
    expect(posOrderItemSchema.safeParse({ productId: "p1", quantity: 2, unitPrice: 10 }).success).toBe(true);
  });
});

describe("posOrderSchema", () => {
  it("requires at least one item", () => {
    expect(posOrderSchema.safeParse({ items: [] }).success).toBe(false);
  });
  it("accepts a valid order", () => {
    expect(
      posOrderSchema.safeParse({ items: [{ productId: "p1", quantity: 1, unitPrice: 10 }] }).success
    ).toBe(true);
  });
});

describe("posPaymentSchema", () => {
  it("rejects negative amounts", () => {
    expect(posPaymentSchema.safeParse({ amount: -1, method: "mpesa" }).success).toBe(false);
  });
  it("accepts mpesa with a phone number", () => {
    expect(
      posPaymentSchema.safeParse({ amount: 100, method: "mpesa", phoneNumber: "254712345678" }).success
    ).toBe(true);
  });
});

describe("posReturnSchema", () => {
  it("requires a valid reason enum and items", () => {
    expect(
      posReturnSchema.safeParse({ reason: "damaged", items: [{ productId: "p1", quantity: 1, unitPrice: 10 }] }).success
    ).toBe(true);
    expect(posReturnSchema.safeParse({ reason: "bogus", items: [{ productId: "p1", quantity: 1, unitPrice: 10 }] }).success).toBe(false);
    expect(posReturnSchema.safeParse({ reason: "damaged", items: [] }).success).toBe(false);
  });
});

describe("posSessionSchema", () => {
  it("accepts a session open with a non-negative float", () => {
    expect(posSessionSchema.safeParse({ openingFloat: 5000 }).success).toBe(true);
    expect(posSessionSchema.safeParse({ openingFloat: -1 }).success).toBe(false);
  });
});
