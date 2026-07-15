import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierPayments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createSupplierPayment } from "@/lib/procurement/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.payments.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const payments = await db.query.procurementSupplierPayments.findMany({
    where: eq(procurementSupplierPayments.organizationId, ctx.organizationId),
    orderBy: (p) => [desc(p.createdAt)],
    with: { supplier: true, purchaseInvoice: true, journalEntry: true },
  });
  return NextResponse.json(payments);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.payments.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createSupplierPayment(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.payment, { status: result.status });
  } catch (error) {
    logger.error("Create supplier payment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
