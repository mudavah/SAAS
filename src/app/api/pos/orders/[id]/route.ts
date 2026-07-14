import { NextResponse } from "next/server";
import { db } from "@/db";
import { posOrders, posOrderPayments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { completeOrder, cancelOrder, getOrder } from "@/lib/pos/service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "pos.sales.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;
  const result = await getOrder(ctx, id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.order);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "pos.sales.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;
  const body = await req.json();

  if (body.action === "complete") {
    const result = await completeOrder(ctx, id, body.payments || []);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "cancel") {
    const result = await cancelOrder(ctx, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "pos.sales.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;
  const result = await cancelOrder(ctx, id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
