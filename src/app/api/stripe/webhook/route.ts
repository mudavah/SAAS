import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations, payments, invoices, paymentWebhookLogs } from "@/db/schema";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
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

  const webhookEvent = await processWebhook("stripe", event);

  await db.insert(paymentWebhookLogs).values({
    provider: "stripe",
    eventType: webhookEvent.type,
    payload: event as unknown as Record<string, unknown>,
    signature,
    processed: false,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSession.metadata?.userId;
        const organizationId = checkoutSession.metadata?.organizationId;
        const plan = (checkoutSession.metadata?.plan || "pro") as PlanType;

        if (userId) {
          await db
            .update(users)
            .set({ plan, updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
        if (organizationId) {
          await db
            .update(organizations)
            .set({ plan, updatedAt: new Date() })
            .where(eq(organizations.id, organizationId));
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const organizationId = subscription.metadata?.organizationId;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : ("free" as PlanType);
        const active = subscription.status === "active" || subscription.status === "trialing";

        if (userId) {
          await db
            .update(users)
            .set({ plan: active ? plan : ("free" as PlanType), updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
        if (organizationId) {
          await db
            .update(organizations)
            .set({ plan: active ? plan : ("free" as PlanType), updatedAt: new Date() })
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
            .set({ plan: "free", updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
        if (organizationId) {
          await db
            .update(organizations)
            .set({ plan: "free", updatedAt: new Date() })
            .where(eq(organizations.id, organizationId));
        }
        break;
      }

      case "payment_intent.succeeded": {
        if (webhookEvent.type === "payment.completed" && webhookEvent.paymentId) {
          const payment = await db.query.payments.findFirst({
            where: eq(payments.reference, webhookEvent.paymentId),
          });

          if (payment && payment.organizationId && payment.status === "pending") {
            const { result } = await verifyPayment(
              { provider: "stripe", providerPaymentId: webhookEvent.paymentId },
              { userId: payment.userId, organizationId: payment.organizationId }
            );

            if (result.success) {
              await db
                .update(payments)
                .set({ status: "completed", paidAt: new Date(), stripePaymentId: webhookEvent.paymentId })
                .where(eq(payments.id, payment.id));

              await createAuditLog({
                action: "payment.update",
                category: "payments",
                organizationId: payment.organizationId,
                userId: payment.userId,
                resourceType: "payment",
                resourceId: payment.id,
                description: "Stripe payment completed via webhook",
                newValues: { status: "completed" },
              });

              await createNotification({
                organizationId: payment.organizationId,
                category: "payments",
                type: "stripe_success",
                title: "Stripe payment received",
                message: `Stripe payment of ${result.amount?.toFixed(2)} ${result.currency} confirmed.`,
                priority: "high",
                deepLink: "/dashboard/payments",
              });
            }
          }
        }
        break;
      }
    }

    await db
      .update(paymentWebhookLogs)
      .set({ processed: true, processedAt: new Date() })
      .where(and(
        eq(paymentWebhookLogs.provider, "stripe"),
        eq(paymentWebhookLogs.eventType, webhookEvent.type),
        eq(paymentWebhookLogs.payload, event as unknown as Record<string, unknown>)
      ));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
