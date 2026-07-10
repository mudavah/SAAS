import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, paymentWebhookLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookEvent = await processWebhook("pesapal", body);

    await db.insert(paymentWebhookLogs).values({
      provider: "pesapal",
      eventType: webhookEvent.type,
      payload: body as Record<string, unknown>,
      processed: false,
    });

    if (webhookEvent.type === "payment.completed" && webhookEvent.paymentId) {
      const payment = await db.query.payments.findFirst({
        where: eq(payments.reference, webhookEvent.paymentId),
      });

      if (payment && payment.status === "pending") {
        const { result } = await verifyPayment(
          { provider: "pesapal", providerPaymentId: webhookEvent.paymentId },
          { userId: payment.userId, organizationId: payment.organizationId || "" }
        );

        if (result.success) {
          await db
            .update(payments)
            .set({ status: "completed", paidAt: new Date() })
            .where(eq(payments.id, payment.id));

          await createAuditLog({
            action: "payment.update",
            category: "payments",
            organizationId: payment.organizationId!,
            userId: payment.userId,
            resourceType: "payment",
            resourceId: payment.id,
            description: "Pesapal payment completed via webhook",
            newValues: { status: "completed", receipt: webhookEvent.receiptNumber },
          });

          await createNotification({
            organizationId: payment.organizationId!,
            category: "payments",
            type: "pesapal_success",
            title: "Pesapal payment received",
            message: `Pesapal payment of ${webhookEvent.amount?.toFixed(2)} confirmed.`,
            priority: "high",
            deepLink: "/dashboard/payments",
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Pesapal webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
