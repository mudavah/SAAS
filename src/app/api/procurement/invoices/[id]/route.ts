import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseInvoices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.invoices.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const invoice = await db.query.procurementPurchaseInvoices.findFirst({
    where: and(
      eq(procurementPurchaseInvoices.id, id),
      eq(procurementPurchaseInvoices.organizationId, ctx.organizationId)
    ),
    with: {
      supplier: true,
      purchaseOrder: true,
      journalEntry: true,
      items: { with: { product: true } },
      payments: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: "Purchase invoice not found" }, { status: 404 });
  return NextResponse.json(invoice);
}
