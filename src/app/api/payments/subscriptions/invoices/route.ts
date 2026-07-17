import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listTaxInvoices, createTaxInvoice } from "@/lib/payments/subscriptions";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const invoices = await listTaxInvoices(res.ctx);
  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  try {
    const invoice = await createTaxInvoice(res.ctx, {
      subscriptionId: body.subscriptionId,
      provider: body.provider,
      providerInvoiceId: body.providerInvoiceId,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      subtotal: Number(body.subtotal),
      taxRate: body.taxRate ? Number(body.taxRate) : 0,
      currency: body.currency,
      invoiceUrl: body.invoiceUrl,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create tax invoice" },
      { status: 400 }
    );
  }
}
