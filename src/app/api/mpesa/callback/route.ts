import { NextResponse } from "next/server";
import { db } from "@/db";
import { parseMpesaCallback } from "@/lib/mpesa";
import { eq, and } from "drizzle-orm";
import { payments, invoices } from "@/db/schema";
import { verifyPayment } from "@/lib/payments/engine";
import { requireWebhookSecret } from "@/lib/payments/webhook-auth";
import { createNotification } from "@/lib/notifications";
import { toCents, fromCents } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = parseMpesaCallback(body);

    if (!result.success) {
      console.log("M-Pesa callback failed:", result.resultDesc);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const auth = await requireWebhookSecret(req, "mpesa", result.checkoutRequestId);
    if (auth.error) return auth.error;
    const webhookOrgId = auth.organizationId;

    const payment = await db.query.payments.findFirst({
      where: webhookOrgId
        ? and(eq(payments.reference, result.checkoutRequestId), eq(payments.organizationId, webhookOrgId))
        : eq(payments.reference, result.checkoutRequestId),
    });

    if (!payment || payment.status !== "pending") {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { result: verifyResult } = await verifyPayment(
      { provider: "mpesa", checkoutRequestId: result.checkoutRequestId },
      { userId: payment.userId, organizationId: payment.organizationId || "" }
    );

    // Only settle when the provider has actually confirmed completion.
    if (verifyResult.success && verifyResult.status === "completed") {
      await db
        .update(payments)
        .set({
          status: "completed",
          mpesaReceipt: result.mpesaReceiptNumber,
          paidAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      if (payment.invoiceId && payment.organizationId && result.amount) {
        const invoice = await db.query.invoices.findFirst({
          where: and(
            eq(invoices.id, payment.invoiceId),
            eq(invoices.organizationId, payment.organizationId)
          ),
        });
        if (invoice) {
          const totalCents = toCents(invoice.total);
          const newPaidCents = Math.min(toCents(invoice.amountPaid) + toCents(result.amount), totalCents);
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

      if (payment.organizationId) {
        await createNotification({
          organizationId: payment.organizationId,
          category: "payments",
          type: "mpesa_success",
          title: "M-Pesa payment successful",
          message: `Received M-Pesa payment of ${result.amount?.toFixed(2)}.`,
          priority: "high",
          deepLink: "/dashboard/payments",
        });
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
