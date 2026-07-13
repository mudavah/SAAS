import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, businesses } from "@/db/schema";
import type { clients, invoiceItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInvoicePdf } from "@/lib/pdf";
import { buildInvoicePdfPayload } from "@/lib/invoice-pdf-data";
import { requireApiContext } from "@/lib/session";

type InvoiceWithRelations = typeof invoices.$inferSelect & {
  client: typeof clients.$inferSelect | null;
  items: (typeof invoiceItems.$inferSelect)[];
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "invoices.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.organizationId, ctx.organizationId)),
    with: { client: true, items: true },
  }) as InvoiceWithRelations | null;

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.organizationId, ctx.organizationId),
  });

  const pdfBuffer = generateInvoicePdf(
    buildInvoicePdfPayload(
      invoice,
      business,
      ctx.name || "Business"
    )
  );

  const pdfArrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength);

  return new NextResponse(pdfArrayBuffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
