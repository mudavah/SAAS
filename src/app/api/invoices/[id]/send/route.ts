import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, businesses } from "@/db/schema";
import type { clients, invoiceItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendInvoiceEmail, isEmailConfigured } from "@/lib/email";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateInvoicePdf } from "@/lib/pdf";
import { buildInvoicePdfPayload } from "@/lib/invoice-pdf-data";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

type InvoiceWithRelations = typeof invoices.$inferSelect & {
  client: typeof clients.$inferSelect | null;
  items: (typeof invoiceItems.$inferSelect)[];
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "invoices.send");
  if ("error" in res) return res.error;
  const { ctx } = res;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email sending is not set up yet. Add your Resend API key to enable invoice emails.",
      },
      { status: 503 }
    );
  }

  const { id } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.organizationId, ctx.organizationId)),
    with: { client: true, items: true },
  }) as InvoiceWithRelations | null;

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!invoice.client?.email) {
    return NextResponse.json(
      { error: "Client has no email address. Add an email to the client first." },
      { status: 400 }
    );
  }

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.organizationId, ctx.organizationId),
  });

  const businessName = business?.name || ctx.name || "Business";
  const pdfPayload = buildInvoicePdfPayload(
    invoice,
    business,
    ctx.name || "Business"
  );
  const pdfBuffer = generateInvoicePdf(pdfPayload);

  try {
    await sendInvoiceEmail({
      to: invoice.client.email,
      clientName: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(invoice.total, invoice.currency),
      dueDate: formatDate(invoice.dueDate),
      businessName,
      mpesaTill: business?.mpesaTill,
      mpesaPaybill: business?.mpesaPaybill,
      notes: invoice.notes,
      pdfBuffer,
    });
  } catch (error) {
    logger.error("Send invoice email error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send email. Check your Resend settings.",
      },
      { status: 500 }
    );
  }

  await db
    .update(invoices)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(invoices.id, id));

  await logAuditSafe(ctx, {
    action: "invoice.send",
    category: "invoices",
    resourceType: "invoice",
    resourceId: invoice.id,
    description: `Sent invoice ${invoice.invoiceNumber} to client`,
    newValues: { status: "sent", sentAt: new Date() },
  });

  await createNotification({
    organizationId: ctx.organizationId,
    category: "invoices",
    type: "invoice_sent",
    title: "Invoice sent",
    message: `Invoice ${invoice.invoiceNumber} sent to client.`,
    deepLink: `/dashboard/invoices/${invoice.id}`,
  });

  return NextResponse.json({
    success: true,
    message: `Invoice emailed to ${invoice.client.email}`,
  });
}
