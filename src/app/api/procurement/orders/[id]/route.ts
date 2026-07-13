import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseOrders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.po.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const order = await db.query.procurementPurchaseOrders.findFirst({
    where: and(
      eq(procurementPurchaseOrders.id, id),
      eq(procurementPurchaseOrders.organizationId, ctx.organizationId)
    ),
    with: {
      supplier: true,
      request: { with: { items: true } },
      items: { with: { product: true, warehouse: true } },
      approvals: true,
      grns: true,
      invoices: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  return NextResponse.json(order);
}
