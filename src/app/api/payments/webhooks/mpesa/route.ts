import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices, paymentWebhookLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { requireWebhookSecret } from "@/lib/payments/webhook-auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toCents, fromCents } from "@/lib/money";

function getReference(body: unknown): string | undefined {
  const cb = (body as any)?.Body?.stkCallback;
  return cb?.CheckoutRequestID as string | undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reference = getReference(body);

    const authError = await requireWebhookSecret(req, "mpesa", reference);
    if (authError) return authError;

    const webhookEvent = await processWebhook("mpesa", body);

    const [log] = await db.insert(paymentWebhookLogs).values({
      provider: "mpesa",
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
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      if (!payment.organizationId) {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date(), error: "Missing organizationId" })
          .where(eq(paymentWebhookLogs.id, log.id));
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      if (payment.status !== "pending") {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(paymentWebhookLogs.id, log.id));
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      const { result } = await verifyPayment(
        { provider: "mpesa", checkoutRequestId: webhookEvent.paymentId },
        { userId: payment.userId, organizationId: payment.organizationId }
      );

      // Only settle when the provider has actually confirmed completion.
      if (result.success && result.status === "completed") {
        await db
          .update(payments)
          .set({ status: "completed", paidAt: new Date(), mpesaReceipt: webhookEvent.receiptNumber || null })
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
          description: "M-Pesa payment completed via webhook",
          newValues: { status: "completed", receipt: webhookEvent.receiptNumber },
        });

        await createNotification({
          organizationId: payment.organizationId,
          category: "payments",
          type: "mpesa_success",
          title: "M-Pesa payment received",
          message: `M-Pesa payment of ${webhookEvent.amount?.toFixed(2)} confirmed.`,
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

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa webhook error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
