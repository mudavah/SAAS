import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listCoupons, createCoupon, applyCoupon } from "@/lib/payments/subscriptions";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const coupons = await listCoupons(res.ctx);
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "validate") {
      const coupon = await applyCoupon(res.ctx, body.code, body.plan);
      return NextResponse.json({ coupon });
    }
    const coupon = await createCoupon(res.ctx, {
      code: body.code,
      name: body.name,
      type: body.type,
      value: Number(body.value),
      plan: body.plan,
      maxRedemptions: body.maxRedemptions ? Number(body.maxRedemptions) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process coupon" },
      { status: 400 }
    );
  }
}
