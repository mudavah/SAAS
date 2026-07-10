import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { paymentSchema, mpesaStkSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import {
  initiateStkPush,
  MpesaError,
  isMpesaConfigured,
} from "@/lib/mpesa";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

function findMatchingInvoice(organizationId: string, amount: number, phone?: string | null) {
  const pendingInvoices = db.query.invoices.findMany({
    where: eq(invoices.organizationId, organizationId),
    with: { client: true },
  });

  return pendingInvoices.then((invs) => {
    const matches = invs.filter((inv) => {
      const invTotal = parseFloat(inv.total);
      const invPaid = parseFloat(inv.amountPaid || "0");
      const remaining = invTotal - invPaid;
      return remaining > 0 && Math.abs(remaining - amount) < 1;
    });

    if (matches.length === 1) return matches[0];
    if (matches.length > 1 && phone) {
      const phoneMatch = matches.find((inv) => inv.client?.phone === phone);
      if (phoneMatch) return phoneMatch;
    }
    return matches[0] || null;
  });
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payments.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.payments.findMany({
    where: eq(payments.organizationId, ctx.organizationId),
    orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    with: { invoice: true, client: true },
  });

  return NextResponse.json({
    payments: rows,
    mpesaConfigured: isMpesaConfigured(),
  });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payments.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (body.method === "mpesa" && body.phone) {
      if (!isMpesaConfigured()) {
        return NextResponse.json(
          {
            error:
              "M-Pesa is not fully configured. Add Consumer Key, Secret, Passkey, Shortcode, and Callback URL to .env.local",
          },
          { status: 503 }
        );
      }

      const parsed = mpesaStkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      const stkResult = await initiateStkPush({
        phone: parsed.data.phone,
        amount: parsed.data.amount,
        accountReference: parsed.data.invoiceId || "KAZIFLOW",
        transactionDesc: "KaziFlow Pay",
      });

      const [payment] = await db
        .insert(payments)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          invoiceId: parsed.data.invoiceId || null,
          amount: parsed.data.amount.toFixed(2),
          method: "mpesa",
          status: "pending",
          mpesaPhone: parsed.data.phone,
          reference: stkResult.CheckoutRequestID,
        })
        .returning();

      await logAuditSafe(ctx, {
        action: "payment.create",
        category: "payments",
        resourceType: "payment",
        resourceId: payment.id,
        description: "Initiated M-Pesa STK push",
        newValues: { amount: payment.amount, invoiceId: payment.invoiceId },
      });

      return NextResponse.json({
        payment,
        message: "STK Push sent. Check the phone to enter M-Pesa PIN.",
        stkResult,
      });
    }

    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    let invoiceId = parsed.data.invoiceId || null;

    if (!invoiceId && parsed.data.method === "mpesa") {
      const matched = await findMatchingInvoice(
        ctx.organizationId,
        parsed.data.amount,
        body.phone
      );
      if (matched) {
        invoiceId = matched.id;
      }
    }

    const [payment] = await db
      .insert(payments)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        invoiceId,
        amount: parsed.data.amount.toFixed(2),
        method: parsed.data.method,
        status: "completed",
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        paidAt: new Date(),
      })
      .returning();

    let invoiceNumber: string | null = null;
    if (invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, ctx.organizationId)
        ),
      });
      if (invoice) {
        invoiceNumber = invoice.invoiceNumber;
        const newPaid =
          parseFloat(invoice.amountPaid || "0") + parsed.data.amount;
        const total = parseFloat(invoice.total);
        await db
          .update(invoices)
          .set({
            amountPaid: newPaid.toFixed(2),
            status: newPaid >= total ? "paid" : "partial",
            paidAt: newPaid >= total ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(invoices.id, invoiceId),
              eq(invoices.organizationId, ctx.organizationId)
            )
          );
      }
    }

    await logAuditSafe(ctx, {
      action: "payment.create",
      category: "payments",
      resourceType: "payment",
      resourceId: payment.id,
      description: `Recorded ${parsed.data.method} payment of ${payment.amount}`,
      newValues: { amount: payment.amount, invoiceId: payment.invoiceId },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "payments",
      type: "payment_recorded",
      title: "Payment recorded",
      message: `Payment of ${payment.amount} recorded${
        invoiceNumber ? ` for invoice ${invoiceNumber}` : ""
      }.`,
      deepLink: "/dashboard/payments",
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Payment error:", error);

    if (error instanceof MpesaError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.code === "CONFIG_MISSING" ? 503 : 502 }
      );
    }

    return NextResponse.json(
      { error: "Payment failed. Please try again." },
      { status: 500 }
    );
  }
}
