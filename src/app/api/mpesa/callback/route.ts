import { NextResponse } from "next/server";
import { db } from "@/db";
import { parseMpesaCallback } from "@/lib/mpesa";
import { eq } from "drizzle-orm";
import { payments } from "@/db/schema";
import { verifyPayment } from "@/lib/payments/engine";
import { createNotification } from "@/lib/notifications";

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

    if (payment && payment.status === "pending") {
      const { result: verifyResult } = await verifyPayment(
        { provider: "mpesa", checkoutRequestId: result.checkoutRequestId },
        { userId: payment.userId, organizationId: payment.organizationId || "" }
      );

      if (verifyResult.success) {
        await db
          .update(payments)
          .set({
            status: "completed",
            mpesaReceipt: result.mpesaReceiptNumber,
            paidAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

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
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
