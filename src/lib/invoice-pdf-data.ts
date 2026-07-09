import type { businesses, clients, invoiceItems, invoices } from "@/db/schema";

type InvoiceWithRelations = typeof invoices.$inferSelect & {
  client: typeof clients.$inferSelect | null;
  items: (typeof invoiceItems.$inferSelect)[];
};

export function buildInvoicePdfPayload(
  invoice: InvoiceWithRelations,
  business: typeof businesses.$inferSelect | null | undefined,
  fallbackBusinessName: string
) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    business: {
      name: business?.name || fallbackBusinessName,
      email: business?.email,
      phone: business?.phone,
      address: business?.address,
      city: business?.city,
      mpesaTill: business?.mpesaTill,
      mpesaPaybill: business?.mpesaPaybill,
    },
    client: invoice.client,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate || "16",
    taxAmount: invoice.taxAmount || "0",
    total: invoice.total,
    amountPaid: invoice.amountPaid || "0",
    currency: invoice.currency,
    notes: invoice.notes,
    terms: invoice.terms,
  };
}
