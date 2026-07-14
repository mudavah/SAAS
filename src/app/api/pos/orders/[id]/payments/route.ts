import { NextResponse } from "next/server";
import { db } from "@/db";
import { posOrders } from "@/db/schema";
import { posPaymentSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { addPayment } from "@/lib/pos/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "pos.sales.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;
  const body = await req.json();
  const result = await addPayment(ctx, id, body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result, { status: result.status });
}
