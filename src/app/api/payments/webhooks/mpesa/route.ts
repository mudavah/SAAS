import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices, paymentWebhookLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processWebhook, verifyPayment } from "@/lib/payments/engine";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookEvent = await processWebhook("mpesa", body);

    await db.insert(paymentWebhookLogs).values({
      provider: "mpesa",
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
          { provider: "mpesa", checkoutRequestId: webhookEvent.paymentId },
          { userId: payment.userId, organizationId: payment.organizationId || "" }
        );

        if (result.success) {
          await db
            .update(payments)
            .set({ status: "completed", paidAt: new Date(), mpesaReceipt: webhookEvent.receiptNumber || null })
            .where(eq(payments.id, payment.id));

          if (payment.invoiceId && webhookEvent.amount) {
            const invoice = await db.query.invoices.findFirst({
              where: and(
                eq(invoices.id, payment.invoiceId),
                eq(invoices.organizationId, payment.organizationId!)
              ),
            });
            if (invoice) {
              const newPaid = parseFloat(invoice.amountPaid || "0") + webhookEvent.amount;
              const total = parseFloat(invoice.total);
              await db
                .update(invoices)
                .set({
                  amountPaid: newPaid.toFixed(2),
                  status: newPaid >= total ? "paid" : "partial",
                  paidAt: newPaid >= total ? new Date() : null,
                  updatedAt: new Date(),
                })
                .where(eq(invoices.id, payment.invoiceId));
            }
          }

          await createAuditLog({
            action: "payment.update",
            category: "payments",
            organizationId: payment.organizationId!,
            userId: payment.userId,
            resourceType: "payment",
            resourceId: payment.id,
            description: `M-Pesa payment completed via webhook`,
            newValues: { status: "completed", receipt: webhookEvent.receiptNumber },
          });

          await createNotification({
            organizationId: payment.organizationId!,
            category: "payments",
            type: "mpesa_success",
            title: "M-Pesa payment received",
            message: `M-Pesa payment of ${webhookEvent.amount?.toFixed(2)} confirmed.`,
            priority: "high",
            deepLink: "/dashboard/payments",
          });
        }
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa webhook error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
