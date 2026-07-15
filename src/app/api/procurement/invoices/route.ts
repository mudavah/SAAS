import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseInvoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createPurchaseInvoice } from "@/lib/procurement/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.invoices.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const invoices = await db.query.procurementPurchaseInvoices.findMany({
    where: eq(procurementPurchaseInvoices.organizationId, ctx.organizationId),
    orderBy: (i) => [desc(i.createdAt)],
    with: { supplier: true, purchaseOrder: true, journalEntry: true, items: { with: { product: true } } },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.invoices.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createPurchaseInvoice(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.invoice, { status: result.status });
  } catch (error) {
    logger.error("Create purchase invoice error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
