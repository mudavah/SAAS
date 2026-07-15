import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierReturns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createSupplierReturn } from "@/lib/procurement/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.returns.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const returns = await db.query.procurementSupplierReturns.findMany({
    where: eq(procurementSupplierReturns.organizationId, ctx.organizationId),
    orderBy: (r) => [desc(r.createdAt)],
    with: { supplier: true, purchaseOrder: true, grn: true, items: { with: { product: true, warehouse: true } } },
  });
  return NextResponse.json(returns);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.returns.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createSupplierReturn(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.return, { status: result.status });
  } catch (error) {
    logger.error("Create supplier return error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
