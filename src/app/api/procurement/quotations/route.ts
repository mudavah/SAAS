import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierQuotations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createSupplierQuotation } from "@/lib/procurement/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const quotations = await db.query.procurementSupplierQuotations.findMany({
    where: eq(procurementSupplierQuotations.organizationId, ctx.organizationId),
    orderBy: (q) => [desc(q.createdAt)],
    with: { supplier: true, rfq: true, items: { with: { product: true } } },
  });
  return NextResponse.json(quotations);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createSupplierQuotation(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.quotation, { status: result.status });
  } catch (error) {
    logger.error("Create supplier quotation error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
