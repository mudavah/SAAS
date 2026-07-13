import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { complianceValidateSchema } from "@/lib/validations";
import { validateKraPin, validateEtimsInvoice } from "@/lib/mpesa";

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) || 0 : v;
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = complianceValidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result: {
      pin?: { valid: boolean; message: string };
      invoice?: { valid: boolean; errors: string[] };
    } = {};

    if (parsed.data.pin !== undefined) {
      result.pin = validateKraPin(parsed.data.pin);
    }

    if (parsed.data.invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, parsed.data.invoiceId),
          eq(invoices.organizationId, ctx.organizationId)
        ),
        with: { client: true, items: true },
      }) as any;
      if (!invoice) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }
      result.invoice = validateEtimsInvoice({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        currency: invoice.currency,
        subtotal: num(invoice.subtotal),
        taxAmount: num(invoice.taxAmount),
        total: num(invoice.total),
        customerName: invoice.client?.name ?? null,
        items: (invoice.items ?? []).map((it: any) => ({
          description: it.description,
          quantity: num(it.quantity),
          unitPrice: num(it.unitPrice),
          amount: num(it.amount),
        })),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Compliance validate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
