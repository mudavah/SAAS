import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { processWebhook } from "@/lib/payments/engine";
import type Stripe from "stripe";
import type { PlanType } from "@/lib/utils";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await processWebhook("stripe", event);

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSession.metadata?.userId;
        const organizationId = checkoutSession.metadata?.organizationId;
        const plan = (checkoutSession.metadata?.plan || "pro") as PlanType;

        if (userId) {
          await db
            .update(users)
            .set({
              plan,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        }
        if (organizationId) {
          await db
            .update(organizations)
            .set({
              plan,
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, organizationId));
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const organizationId = subscription.metadata?.organizationId;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : "free";
        const active = subscription.status === "active" || subscription.status === "trialing";

        if (userId) {
          await db
            .update(users)
            .set({
              plan: active ? plan : "free",
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        }
        if (organizationId) {
          await db
            .update(organizations)
            .set({
              plan: active ? plan : "free",
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, organizationId));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const organizationId = subscription.metadata?.organizationId;

        if (userId) {
          await db
            .update(users)
            .set({
              plan: "free",
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        }
        if (organizationId) {
          await db
            .update(organizations)
            .set({
              plan: "free",
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, organizationId));
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
