import { describe, it, expect } from "vitest";
import {
  procurementPurchaseRequestSchema,
  procurementRfqSchema,
  procurementSupplierQuotationSchema,
  procurementPurchaseOrderSchema,
  procurementGrnSchema,
  procurementSupplierReturnSchema,
  procurementPurchaseInvoiceSchema,
  procurementSupplierPaymentSchema,
  procurementBudgetSchema,
} from "@/lib/validations";
import { computeLineTotals } from "@/lib/procurement/service";

describe("computeLineTotals", () => {
  it("sums subtotal, tax and total with default 16% tax", () => {
    const t = computeLineTotals([
      { quantity: 10, unitCost: 100 },
      { quantity: 5, unitCost: 200 },
    ]);
    expect(t.subtotal).toBe(2000);
    expect(t.taxAmount).toBe(320);
    expect(t.total).toBe(2320);
  });

  it("honours a per-line tax rate override", () => {
    const t = computeLineTotals([{ quantity: 1, unitCost: 100, taxRate: 0 }]);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(100);
  });
});

describe("procurementPurchaseRequestSchema", () => {
  it("accepts a valid request", () => {
    const r = procurementPurchaseRequestSchema.safeParse({
      title: "Office supplies",
      priority: "high",
      requestedDate: "2026-01-01",
      items: [{ description: "Paper", quantity: 5, estUnitCost: 20 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a request with no items", () => {
    const r = procurementPurchaseRequestSchema.safeParse({ title: "X", items: [] });
    expect(r.success).toBe(false);
  });
});

describe("procurementRfqSchema", () => {
  it("requires at least one supplier", () => {
    const r = procurementRfqSchema.safeParse({ title: "RFQ", supplierIds: [] });
    expect(r.success).toBe(false);
  });

  it("accepts a valid RFQ with a supplier", () => {
    const r = procurementRfqSchema.safeParse({
      title: "RFQ",
      supplierIds: ["sup-1"],
      items: [{ description: "Widget", quantity: 10 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("procurementSupplierQuotationSchema", () => {
  it("requires supplier, number and items", () => {
    const r = procurementSupplierQuotationSchema.safeParse({
      supplierId: "",
      quotationNumber: "",
      receivedDate: "2026-01-01",
      items: [],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a valid quotation", () => {
    const r = procurementSupplierQuotationSchema.safeParse({
      supplierId: "sup-1",
      quotationNumber: "SQ-1",
      receivedDate: "2026-01-01",
      items: [{ description: "Widget", quantity: 10, unitPrice: 50 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("procurementPurchaseOrderSchema", () => {
  it("accepts a valid PO", () => {
    const r = procurementPurchaseOrderSchema.safeParse({
      supplierId: "sup-1",
      orderDate: "2026-01-01",
      items: [{ description: "Widget", quantity: 10, unitCost: 50 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a PO without items", () => {
    const r = procurementPurchaseOrderSchema.safeParse({
      supplierId: "sup-1",
      orderDate: "2026-01-01",
      items: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("procurementGrnSchema", () => {
  it("requires poItemId and warehouseId on items", () => {
    const r = procurementGrnSchema.safeParse({
      receivedDate: "2026-01-01",
      items: [{ poItemId: "", warehouseId: "", quantityReceived: 5 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a valid receipt", () => {
    const r = procurementGrnSchema.safeParse({
      receivedDate: "2026-01-01",
      items: [{ poItemId: "pi-1", warehouseId: "wh-1", quantityReceived: 5 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("procurementSupplierReturnSchema", () => {
  it("accepts a valid return", () => {
    const r = procurementSupplierReturnSchema.safeParse({
      supplierId: "sup-1",
      returnDate: "2026-01-01",
      items: [{ description: "Broken", quantity: 2, unitCost: 10 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a return with no items", () => {
    const r = procurementSupplierReturnSchema.safeParse({
      supplierId: "sup-1",
      returnDate: "2026-01-01",
      items: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("procurementPurchaseInvoiceSchema", () => {
  it("accepts a valid invoice", () => {
    const r = procurementPurchaseInvoiceSchema.safeParse({
      supplierId: "sup-1",
      invoiceNumber: "INV-1",
      issueDate: "2026-01-01",
      dueDate: "2026-02-01",
      items: [{ description: "Goods", quantity: 3, unitCost: 100 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("procurementSupplierPaymentSchema", () => {
  it("accepts a valid payment", () => {
    const r = procurementSupplierPaymentSchema.safeParse({
      supplierId: "sup-1",
      amount: 500,
      method: "bank_transfer",
      paymentDate: "2026-01-01",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid payment method", () => {
    const r = procurementSupplierPaymentSchema.safeParse({
      supplierId: "sup-1",
      amount: 500,
      method: "cheque",
      paymentDate: "2026-01-01",
    });
    expect(r.success).toBe(false);
  });
});

describe("procurementBudgetSchema", () => {
  it("accepts a valid budget", () => {
    const r = procurementBudgetSchema.safeParse({
      name: "Q3 IT",
      period: "quarterly",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
      amount: 100000,
    });
    expect(r.success).toBe(true);
  });
});
