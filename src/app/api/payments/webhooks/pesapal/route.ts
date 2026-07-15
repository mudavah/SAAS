import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { payments, invoices, paymentWebhookLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { requireWebhookSecret } from "@/lib/payments/webhook-auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toCents, fromCents } from "@/lib/money";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const reference = (body as any)?.order_tracking_id as string | undefined;

    const auth = await requireWebhookSecret(req, "pesapal", reference, rawBody);
    if (auth.error) return auth.error;
    const webhookOrgId = auth.organizationId;

    const webhookEvent = await processWebhook("pesapal", body);

    const dedupeKey = crypto.createHash("sha256").update(`pesapal:${reference || webhookEvent.paymentId || "unknown"}`).digest("hex");

    const sanitizedPayload = {
      type: webhookEvent.type,
      reference: reference || null,
      amount: webhookEvent.amount ?? null,
      status: webhookEvent.status,
      receivedAt: new Date().toISOString(),
    };

    const inserted = await db.insert(paymentWebhookLogs).values({
      provider: "pesapal",
      eventType: webhookEvent.type,
      payload: sanitizedPayload as Record<string, unknown>,
      dedupeKey,
      processed: false,
    }).onConflictDoNothing({ target: paymentWebhookLogs.dedupeKey }).returning();

    if (inserted.length === 0) {
      return NextResponse.json({ received: true });
    }

    const [log] = inserted;

    if (webhookEvent.type === "payment.completed" && webhookEvent.paymentId) {
      const payment = await db.query.payments.findFirst({
        where: webhookOrgId
          ? and(eq(payments.reference, webhookEvent.paymentId), eq(payments.organizationId, webhookOrgId))
          : eq(payments.reference, webhookEvent.paymentId),
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

      if (result.success && result.status === "completed") {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(paymentWebhookLogs.id, log.id));

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
      } else {
        await db.update(paymentWebhookLogs)
          .set({ processed: true, processedAt: new Date(), error: result.error })
          .where(eq(paymentWebhookLogs.id, log.id));
      }
    } else {
      await db.update(paymentWebhookLogs)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(paymentWebhookLogs.id, log.id));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Pesapal webhook error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
