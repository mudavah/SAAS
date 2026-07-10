import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { payments, paymentWebhookLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

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
    const webhookEvent = await processWebhook("stripe", event);
    
    await db.insert(paymentWebhookLogs).values({
      provider: "stripe",
      eventType: webhookEvent.type,
      payload: event as unknown as Record<string, unknown>,
      signature,
      processed: false,
    });

    const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
    const metadata = (obj as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined;
    const paymentId = metadata?.paymentId;
    const organizationId = metadata?.organizationId;

    if (paymentId && organizationId && webhookEvent.type === "payment.completed") {
      const payment = await db.query.payments.findFirst({
        where: and(eq(payments.id, paymentId), eq(payments.organizationId, organizationId)),
      });

      if (payment && payment.status === "pending") {
        const providerPaymentId =
        (obj as any).payment_intent || (obj as any).id;
        
        const { result } = await verifyPayment(
          { provider: "stripe", providerPaymentId },
          { userId: payment.userId, organizationId }
        );

        if (result.success) {
          await db
            .update(payments)
            .set({ status: "completed", paidAt: new Date(), stripePaymentId: providerPaymentId })
            .where(eq(payments.id, payment.id));

          await createAuditLog({
            action: "payment.update",
            category: "payments",
            organizationId,
            userId: payment.userId,
            resourceType: "payment",
            resourceId: payment.id,
            description: "Stripe payment completed via webhook",
            newValues: { status: "completed" },
          });

          await createNotification({
            organizationId,
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

    if (webhookEvent.type === "subscription.updated" || webhookEvent.type === "subscription.created" || webhookEvent.type === "subscription.cancelled") {
      const userId = metadata?.userId;
      const orgId = metadata?.organizationId;

      if (userId && orgId) {
        await db
          .update(payments)
          .set({ status: webhookEvent.type === "subscription.cancelled" ? "failed" : "completed" })
          .where(eq(payments.organizationId, orgId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
