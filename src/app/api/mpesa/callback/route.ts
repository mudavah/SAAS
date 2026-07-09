import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { parseMpesaCallback } from "@/lib/mpesa";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = parseMpesaCallback(body);

    if (!result.success) {
      console.log("M-Pesa callback failed:", result.resultDesc);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.reference, result.checkoutRequestId),
    });

    if (payment) {
      await db
        .update(payments)
        .set({
          status: "completed",
          mpesaReceipt: result.mpesaReceiptNumber,
          paidAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      if (payment.invoiceId && result.amount) {
        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, payment.invoiceId),
        });
        if (invoice) {
          const newPaid =
            parseFloat(invoice.amountPaid || "0") + result.amount;
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
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
