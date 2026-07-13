import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierPayments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.payments.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const payment = await db.query.procurementSupplierPayments.findFirst({
    where: and(
      eq(procurementSupplierPayments.id, id),
      eq(procurementSupplierPayments.organizationId, ctx.organizationId)
    ),
    with: { supplier: true, purchaseInvoice: true, journalEntry: true },
  });
  if (!payment) return NextResponse.json({ error: "Supplier payment not found" }, { status: 404 });
  return NextResponse.json(payment);
}
