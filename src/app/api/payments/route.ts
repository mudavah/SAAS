import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { paymentSchema, mpesaStkSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import {
  initiateStkPush,
  MpesaError,
  isMpesaConfigured,
} from "@/lib/mpesa";

function findMatchingInvoice(userId: string, amount: number, phone?: string | null) {
  const pendingInvoices = db.query.invoices.findMany({
    where: eq(invoices.userId, userId),
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userPayments = await db.query.payments.findMany({
    where: eq(payments.userId, session.user.id),
    orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    with: { invoice: true, client: true },
  });

  return NextResponse.json({
    payments: userPayments,
    mpesaConfigured: isMpesaConfigured(),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          userId: session.user.id,
          invoiceId: parsed.data.invoiceId || null,
          amount: parsed.data.amount.toFixed(2),
          method: "mpesa",
          status: "pending",
          mpesaPhone: parsed.data.phone,
          reference: stkResult.CheckoutRequestID,
        })
        .returning();

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
      const matched = await findMatchingInvoice(session.user.id, parsed.data.amount, body.phone);
      if (matched) {
        invoiceId = matched.id;
      }
    }

    const [payment] = await db
      .insert(payments)
      .values({
        userId: session.user.id,
        invoiceId,
        amount: parsed.data.amount.toFixed(2),
        method: parsed.data.method,
        status: "completed",
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        paidAt: new Date(),
      })
      .returning();

    if (invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });
      if (invoice) {
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
          .where(eq(invoices.id, invoiceId));
      }
    }

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
