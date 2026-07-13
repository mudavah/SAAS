import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseOrders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createPurchaseOrder } from "@/lib/procurement/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.po.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const orders = await db.query.procurementPurchaseOrders.findMany({
    where: eq(procurementPurchaseOrders.organizationId, ctx.organizationId),
    orderBy: (o) => [desc(o.createdAt)],
    with: {
      supplier: true,
      request: true,
      items: { with: { product: true, warehouse: true } },
      approvals: true,
    },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.po.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createPurchaseOrder(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.po, { status: result.status });
  } catch (error) {
    console.error("Create purchase order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
