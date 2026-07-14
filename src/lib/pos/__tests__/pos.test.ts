import { describe, it, expect } from "vitest";
import { computeLineTotals } from "@/lib/pos/service";

describe("POS Service", () => {
  describe("computeLineTotals", () => {
    it("computes totals for simple items without tax", () => {
      const result = computeLineTotals(
        [
          { quantity: 2, unitPrice: 100, taxRate: 0 },
          { quantity: 1, unitPrice: 50, taxRate: 0 },
        ],
        0
      );

      expect(result.subtotal).toBe(250);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(250);
    });

    it("computes totals with default 16% tax rate", () => {
      const result = computeLineTotals(
        [
          { quantity: 1, unitPrice: 1000 },
          { quantity: 2, unitPrice: 500 },
        ]
      );

      expect(result.subtotal).toBe(2000);
      expect(result.taxAmount).toBeCloseTo(320, 2);
      expect(result.total).toBeCloseTo(2320, 2);
    });

    it("applies discounts before tax", () => {
      const result = computeLineTotals(
        [
          { quantity: 1, unitPrice: 100, discount: 10, taxRate: 16 },
        ],
        16
      );

      expect(result.subtotal).toBe(90);
      expect(result.taxAmount).toBeCloseTo(14.4, 2);
      expect(result.total).toBeCloseTo(104.4, 2);
    });

    it("handles zero quantity", () => {
      const result = computeLineTotals(
        [
          { quantity: 0, unitPrice: 100, taxRate: 16 },
        ],
        16
      );

      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });

    it("rounds to 2 decimal places", () => {
      const result = computeLineTotals(
        [
          { quantity: 3, unitPrice: 333.33, taxRate: 16 },
        ],
        16
      );

      expect(result.subtotal).toBeCloseTo(999.99, 2);
      expect(result.taxAmount).toBeCloseTo(159.9984, 2);
      expect(result.total).toBeCloseTo(1159.99, 2);
    });
  });
});
