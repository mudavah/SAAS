import { NextResponse } from "next/server";
import { db } from "@/db";
import { posOrders, posOrderItems, posOrderPayments } from "@/db/schema";
import { posOrderSchema, posPaymentSchema } from "@/lib/validations";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";
import { createOrder, getPosStats, listOrders } from "@/lib/pos/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "pos.sales.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const limit = Number(url.searchParams.get("limit") || 20);
  const offset = Number(url.searchParams.get("offset") || 0);

  const result = await listOrders(ctx, { status, limit, offset });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "pos.sales.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createOrder(ctx, body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await createNotification({
      organizationId: ctx.organizationId,
      category: "pos",
      type: "pos_order_created",
      title: "POS order created",
      message: `Order ${result.order.orderNumber} was created.`,
      priority: "normal",
      deepLink: `/dashboard/pos`,
    });

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Create POS order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
