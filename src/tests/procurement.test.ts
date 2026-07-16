/**
 * Procurement module — unit tests (expanded)
 * ------------------------------------------------------------------
 * Builds on the existing procurement tests with extra coverage of the
 * procurement validation schemas and line-total math used by requests, RFQs,
 * quotations, purchase orders, GRNs, invoices, payments, budgets, suppliers
 * and returns. Pure (no DB) so it runs in CI without a live database.
 */
import { describe, it, expect } from "vitest";
import {
  procurementPurchaseRequestSchema,
  procurementRfqSchema,
  procurementSupplierQuotationSchema,
  procurementPurchaseOrderSchema,
  procurementGrnSchema,
  procurementPurchaseInvoiceSchema,
  procurementSupplierPaymentSchema,
  procurementBudgetSchema,
  procurementSupplierReturnSchema,
} from "@/lib/validations";
import { inventorySupplierSchema } from "@/lib/validations";
import { computeLineTotals } from "@/lib/procurement/service";

const d = "2026-01-01";

describe("procurement line totals", () => {
  it("sums subtotal/tax/total at 16% default", () => {
    const t = computeLineTotals([{ quantity: 3, unitCost: 100 }]);
    expect(t.subtotal).toBe(300);
    expect(t.taxAmount).toBe(48);
    expect(t.total).toBe(348);
  });
  it("supports zero-rated lines", () => {
    const t = computeLineTotals([{ quantity: 2, unitCost: 50, taxRate: 0 }]);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(100);
  });
});

describe("procurement request / rfq / quotation", () => {
  it("purchase request needs a title, date and non-empty item list", () => {
    expect(procurementPurchaseRequestSchema.safeParse({ title: "Req", requestedDate: d, items: [] }).success).toBe(false);
    expect(
      procurementPurchaseRequestSchema.safeParse({
        title: "Office supplies",
        requestedDate: d,
        items: [{ description: "Paper", quantity: 5, estUnitCost: 20 }],
      }).success
    ).toBe(true);
  });
  it("RFQ needs at least one supplier", () => {
    expect(procurementRfqSchema.safeParse({ title: "RFQ", items: [{ description: "x", quantity: 1 }] }).success).toBe(false);
    expect(procurementRfqSchema.safeParse({ title: "RFQ", supplierIds: ["s1"], items: [{ description: "x", quantity: 1 }] }).success).toBe(true);
  });
  it("quotation must reference a supplier and carry items", () => {
    expect(
      procurementSupplierQuotationSchema.safeParse({ supplierId: "s1", quotationNumber: "Q1", receivedDate: d, items: [{ description: "x", quantity: 1, unitPrice: 100 }] }).success
    ).toBe(true);
    expect(procurementSupplierQuotationSchema.safeParse({ quotationNumber: "Q1", receivedDate: d, items: [{ description: "x", quantity: 1, unitPrice: 100 }] }).success).toBe(false);
  });
});

describe("procurement PO / GRN / invoice / payment", () => {
  it("PO requires an order date and items", () => {
    expect(procurementPurchaseOrderSchema.safeParse({ items: [] }).success).toBe(false);
    expect(procurementPurchaseOrderSchema.safeParse({ orderDate: d, items: [{ description: "x", quantity: 1, unitCost: 10 }] }).success).toBe(true);
  });
  it("GRN requires received items", () => {
    expect(procurementGrnSchema.safeParse({ items: [] }).success).toBe(false);
    expect(procurementGrnSchema.safeParse({ receivedDate: d, items: [{ poItemId: "i1", warehouseId: "w1", quantityReceived: 2 }] }).success).toBe(true);
  });
  it("invoice requires a supplier and a positive amount-like line", () => {
    expect(procurementPurchaseInvoiceSchema.safeParse({ supplierId: "s1", invoiceNumber: "I1", issueDate: d, dueDate: d, items: [{ description: "x", quantity: 1, unitCost: 10 }] }).success).toBe(true);
    expect(procurementPurchaseInvoiceSchema.safeParse({ invoiceNumber: "I1", issueDate: d, dueDate: d, items: [{ description: "x", quantity: 1, unitCost: 10 }] }).success).toBe(false);
  });
  it("supplier payment requires positive amount, method and date", () => {
    expect(procurementSupplierPaymentSchema.safeParse({ supplierId: "s1", amount: -5, method: "mpesa", paymentDate: d }).success).toBe(false);
    expect(procurementSupplierPaymentSchema.safeParse({ supplierId: "s1", amount: 50, method: "mpesa", paymentDate: d }).success).toBe(true);
  });
});

describe("procurement budget / supplier / return", () => {
  it("budget requires a name, period and positive amount", () => {
    expect(procurementBudgetSchema.safeParse({ name: "Ops", periodStart: d, periodEnd: "2026-12-31", amount: 10000 }).success).toBe(true);
    expect(procurementBudgetSchema.safeParse({ periodStart: d, periodEnd: "2026-12-31", amount: 10000 }).success).toBe(false);
    expect(procurementBudgetSchema.safeParse({ name: "Ops", periodStart: d, periodEnd: "2026-12-31", amount: -1 }).success).toBe(false);
  });
  it("supplier requires a name", () => {
    expect(inventorySupplierSchema.safeParse({ name: "Acme" }).success).toBe(true);
    expect(inventorySupplierSchema.safeParse({}).success).toBe(false);
  });
  it("return requires items and a date", () => {
    expect(procurementSupplierReturnSchema.safeParse({ returnDate: d, items: [{ productId: "p1", quantity: 1, unitCost: 10 }] }).success).toBe(true);
    expect(procurementSupplierReturnSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
