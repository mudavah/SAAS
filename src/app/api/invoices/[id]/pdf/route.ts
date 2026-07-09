import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, businesses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInvoicePdf } from "@/lib/pdf";
import { buildInvoicePdfPayload } from "@/lib/invoice-pdf-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.userId, session.user.id)),
    with: { client: true, items: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.userId, session.user.id),
  });

  const pdfBuffer = generateInvoicePdf(
    buildInvoicePdfPayload(
      invoice,
      business,
      session.user.name || "Business"
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
