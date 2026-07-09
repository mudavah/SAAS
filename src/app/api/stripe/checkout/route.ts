import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

export async function GET() {
  return NextResponse.json(getStripeConfigStatus());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { plan } = await req.json();
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
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await createStripeCustomer(
        session.user.email,
        session.user.name ?? undefined
      );
      customerId = customer.id;
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    }

    const priceId = getPriceIdForPlan(plan);
    const checkoutSession = await createCheckoutSession(
      customerId,
      priceId,
      session.user.id,
      plan
    );

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    const stripeError = error as Stripe.errors.StripeError;
    const message =
      stripeError?.type === "StripeAuthenticationError"
        ? "Invalid STRIPE_SECRET_KEY. Copy your Secret key from Stripe Dashboard → Developers → API keys"
        : stripeError?.message ||
          (error instanceof Error ? error.message : "Failed to start checkout");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
