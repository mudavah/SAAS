import { NextResponse } from "next/server";
import { createPayment } from "@/lib/payments/engine";
import { requireApiContext } from "@/lib/session";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payments.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { provider, amount, description, invoiceId, returnUrl, cancelUrl } = body;

    const { payment, result } = await createPayment(
      {
        provider: provider || "mpesa",
        amount: parseFloat(amount),
        currency: "KES",
        method: provider || "mpesa",
        invoiceId: invoiceId || undefined,
        description: description || "Payment",
        returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments`,
        cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments`,
        metadata: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
        },
      },
      { userId: ctx.userId!, organizationId: ctx.organizationId }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      payment,
      checkoutUrl: result.checkoutUrl,
      paymentLink: result.paymentLink,
      reference: result.reference,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
