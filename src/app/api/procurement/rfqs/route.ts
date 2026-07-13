import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementRfqs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createRfq } from "@/lib/procurement/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.rfq.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rfqs = await db.query.procurementRfqs.findMany({
    where: eq(procurementRfqs.organizationId, ctx.organizationId),
    orderBy: (r) => [desc(r.createdAt)],
    with: { items: true, suppliers: { with: { supplier: true } }, quotations: true },
  });
  return NextResponse.json(rfqs);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.rfq.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createRfq(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.rfq, { status: result.status });
  } catch (error) {
    console.error("Create RFQ error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
