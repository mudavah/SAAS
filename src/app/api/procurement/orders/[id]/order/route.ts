import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { orderPurchaseOrder } from "@/lib/procurement/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.po.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const result = await orderPurchaseOrder(ctx, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.po, { status: result.status });
}
