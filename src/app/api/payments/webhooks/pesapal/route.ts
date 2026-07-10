import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices, paymentWebhookLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { requireWebhookSecret } from "@/lib/payments/webhook-auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toCents, fromCents } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reference = (body as any)?.order_tracking_id as string | undefined;

    const authError = await requireWebhookSecret(req, "pesapal", reference);
    if (authError) return authError;

    const webhookEvent = await processWebhook("pesapal", body);

    const [log] = await db.insert(paymentWebhookLogs).values({
      provider: "pesapal",
      eventType: webhookEvent.type,
      payload: body as Record<string, unknown>,
      processed: false,
    }).returning();

    if (webhookEvent.type === "payment.completed" && webhookEvent.paymentId) {
      const payment = await db.query.payments.findFirst({
        where: eq(payments.reference, webhookEvent.paymentId),
      });

      if (!payment) {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date(), error: "Payment not found" })
          .where(eq(paymentWebhookLogs.id, log.id));
        return NextResponse.json({ received: true });
      }

      if (!payment.organizationId) {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date(), error: "Missing organizationId" })
          .where(eq(paymentWebhookLogs.id, log.id));
        return NextResponse.json({ received: true });
      }

      if (payment.status !== "pending") {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(paymentWebhookLogs.id, log.id));
        return NextResponse.json({ received: true });
      }

      const { result } = await verifyPayment(
        { provider: "pesapal", providerPaymentId: webhookEvent.paymentId },
        { userId: payment.userId, organizationId: payment.organizationId }
      );

      // Only settle when the provider has actually confirmed completion.
      if (result.success && result.status === "completed") {
        await db
          .update(payments)
          .set({ status: "completed", paidAt: new Date() })
          .where(eq(payments.id, payment.id));

        if (payment.invoiceId && webhookEvent.amount) {
          const invoice = await db.query.invoices.findFirst({
            where: and(
              eq(invoices.id, payment.invoiceId),
              eq(invoices.organizationId, payment.organizationId)
            ),
          });
          if (invoice) {
            const totalCents = toCents(invoice.total);
            const newPaidCents = Math.min(toCents(invoice.amountPaid) + toCents(webhookEvent.amount), totalCents);
            await db
              .update(invoices)
              .set({
                amountPaid: fromCents(newPaidCents),
                status: newPaidCents >= totalCents ? "paid" : "partial",
                paidAt: newPaidCents >= totalCents ? new Date() : null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, payment.invoiceId));
          }
        }

        await createAuditLog({
          action: "payment.update",
          category: "payments",
          organizationId: payment.organizationId,
          userId: payment.userId,
          resourceType: "payment",
          resourceId: payment.id,
          description: "Pesapal payment completed via webhook",
          newValues: { status: "completed", receipt: webhookEvent.receiptNumber },
        });

        await createNotification({
          organizationId: payment.organizationId,
          category: "payments",
          type: "pesapal_success",
          title: "Pesapal payment received",
          message: `Pesapal payment of ${webhookEvent.amount?.toFixed(2)} confirmed.`,
          priority: "high",
          deepLink: "/dashboard/payments",
        });

        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(paymentWebhookLogs.id, log.id));
      } else {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date(), error: result.error })
          .where(eq(paymentWebhookLogs.id, log.id));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Pesapal webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
