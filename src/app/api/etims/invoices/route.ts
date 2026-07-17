import { NextResponse } from "next/server";
import { db } from "@/db";
import { etimsInvoices, invoices, etimsConfig } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logger } from "@/lib/logger";
import { submitInvoice } from "@/lib/compliance/engine";

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

    // Route through the compliance engine (handles real eTIMS submission with a
    // graceful simulated fallback when no live credentials are configured).
    const result = await submitInvoice(ctx, invoice.id);
    if (!result.ok || !result.record) {
      return NextResponse.json(
        { error: result.error ?? "eTIMS submission failed" },
        { status: 502 }
      );
    }
    const etimsRecord = result.record;

    return NextResponse.json(etimsRecord, { status: 201 });
  } catch (error) {
    logger.error("Submit to eTIMS error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
