import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  isPlanCheckoutReady,
  getStripeConfigStatus,
  createCheckoutSession,
  createStripeCustomer,
  getPriceIdForPlan,
} from "@/lib/stripe";
import type Stripe from "stripe";
import { requireApiContext } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function GET() {
  return NextResponse.json(getStripeConfigStatus());
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const { plan, trialDays, coupon } = await req.json();
    if (plan !== "pro" && plan !== "business") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!isPlanCheckoutReady(plan)) {
      const status = getStripeConfigStatus();
      return NextResponse.json(
        {
          error: status.usingPlaceholders
            ? "Stripe keys in .env.local are still placeholders (sk_test_..., price_...). Replace them with real values from dashboard.stripe.com"
            : `Stripe is not configured for the ${plan} plan. Add STRIPE_SECRET_KEY and STRIPE_${plan.toUpperCase()}_PRICE_ID to .env.local`,
        },
        { status: 503 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await createStripeCustomer(
        user.email,
        user.name ?? undefined
      );
      customerId = customer.id;
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, ctx.userId!));
    }

    const priceId = getPriceIdForPlan(plan);
    const checkoutSession = await createCheckoutSession(
      customerId,
      priceId,
      ctx.userId!,
      plan,
      ctx.organizationId,
      {
        trialDays: typeof trialDays === "number" && trialDays > 0 ? trialDays : undefined,
        coupon: typeof coupon === "string" && coupon ? coupon : undefined,
      }
    );

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error("Stripe checkout error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });

    const stripeError = error as Stripe.errors.StripeError;
    const message =
      stripeError?.type === "StripeAuthenticationError"
        ? "Invalid STRIPE_SECRET_KEY. Copy your Secret key from Stripe Dashboard → Developers → API keys"
        : stripeError?.message ||
          (error instanceof Error ? error.message : "Failed to start checkout");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
