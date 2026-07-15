import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { paymentSchema, mpesaStkSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import { createPayment, verifyPayment, getPaymentHistory, getPaymentStats, PaymentEngineError, getDefaultProvider } from "@/lib/payments/engine";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { toCents, fromCents } from "@/lib/money";
import { dispatchBusinessEvent } from "@/lib/automation/engine";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payments.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await getPaymentHistory(ctx.organizationId);
  const stats = await getPaymentStats(ctx.organizationId);

  return NextResponse.json({ payments: rows, stats });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payments.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (body.method === "mpesa" && body.phone) {
      const parsed = mpesaStkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      const { payment, result } = await createPayment(
        {
          provider: "mpesa",
          amount: parsed.data.amount,
          currency: "KES",
          method: "mpesa",
          invoiceId: parsed.data.invoiceId || undefined,
          phoneNumber: parsed.data.phone,
          description: "KaziFlow Payment",
        },
        { userId: ctx.userId!, organizationId: ctx.organizationId }
      );

      return NextResponse.json({
        payment,
        message: result.checkoutUrl ? "STK Push sent. Check the phone to enter M-Pesa PIN." : "Payment recorded.",
        checkoutUrl: result.checkoutUrl,
        stkResult: result.rawResponse,
      });
    }

    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const method = parsed.data.method;
    const paymentProvider = (method === "other" ? "bank_transfer" : method === "cash" ? "bank_transfer" : method) as "mpesa" | "stripe" | "bank_transfer";

    const { payment, result } = await createPayment(
      {
        provider: paymentProvider,
        amount: parsed.data.amount,
        currency: "KES",
        method: parsed.data.method,
        invoiceId: parsed.data.invoiceId || undefined,
        reference: parsed.data.reference,
        description: parsed.data.notes,
      },
      { userId: ctx.userId!, organizationId: ctx.organizationId }
    );

    const invoiceId = payment.invoiceId;
    if (result.success && !result.checkoutUrl && invoiceId) {
      await db.transaction(async (tx) => {
        const invoice = await tx.query.invoices.findFirst({
          where: and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, ctx.organizationId)
          ),
        });
        if (!invoice) return;
        const totalCents = toCents(invoice.total);
        const newPaidCents = Math.min(toCents(invoice.amountPaid) + toCents(parsed.data.amount), totalCents);
        await tx
          .update(invoices)
          .set({
            amountPaid: fromCents(newPaidCents),
            status: newPaidCents >= totalCents ? "paid" : "partial",
            paidAt: newPaidCents >= totalCents ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));
      });

      // Fire event-driven automations for completed payments (best-effort).
      void dispatchBusinessEvent({
        type: "payment.received",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        payload: { payment: { id: payment.id, amount: parsed.data.amount, invoiceId }, id: payment.id },
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    logger.error("Payment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });

    if (error instanceof PaymentEngineError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502 }
      );
    }

    return NextResponse.json(
      { error: "Payment failed. Please try again." },
      { status: 500 }
    );
  }
}
