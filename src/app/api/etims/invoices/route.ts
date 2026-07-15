import { NextResponse } from "next/server";
import { db } from "@/db";
import { etimsInvoices, invoices, etimsConfig } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const etimsRecords = await db.query.etimsInvoices.findMany({
    where: eq(etimsInvoices.organizationId, ctx.organizationId),
    orderBy: (records) => [desc(records.createdAt)],
    with: {
      invoice: {
        with: {
          client: true,
        },
      },
    },
  });

  return NextResponse.json(etimsRecords);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "compliance.submit");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.organizationId, ctx.organizationId)),
      with: { client: true, items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const config = await db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.organizationId, ctx.organizationId),
    });

    if (!config || !config.isActive) {
      return NextResponse.json(
        { error: "eTIMS is not configured or active" },
        { status: 503 }
      );
    }

    const mockResponse = {
      invoiceNumber: `ETIMS-${Date.now()}`,
      status: "validated",
      message: "Invoice submitted successfully to KRA",
    };

    const [etimsRecord] = await db
      .insert(etimsInvoices)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        invoiceId: invoice.id,
        etimsInvoiceNumber: mockResponse.invoiceNumber,
        status: "validated",
        submissionResponse: mockResponse,
        submittedAt: new Date(),
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "etims_invoice.submit",
      category: "compliance",
      resourceType: "etims_invoice",
      resourceId: etimsRecord.id,
      description: `Submitted invoice ${invoice.invoiceNumber} to KRA eTIMS`,
      newValues: { etimsInvoiceNumber: mockResponse.invoiceNumber, status: "validated" },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "compliance",
      type: "etims_submitted",
      title: "eTIMS submission",
      message: `Invoice ${invoice.invoiceNumber} submitted to KRA eTIMS.`,
      deepLink: "/dashboard/compliance",
    });

    return NextResponse.json(etimsRecord, { status: 201 });
  } catch (error) {
    logger.error("Submit to eTIMS error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
