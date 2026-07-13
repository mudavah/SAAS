import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierQuotations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const quotation = await db.query.procurementSupplierQuotations.findFirst({
    where: and(
      eq(procurementSupplierQuotations.id, id),
      eq(procurementSupplierQuotations.organizationId, ctx.organizationId)
    ),
    with: { supplier: true, rfq: true, items: { with: { product: true } } },
  });
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  return NextResponse.json(quotation);
}
