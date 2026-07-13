import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierReturns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.returns.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const ret = await db.query.procurementSupplierReturns.findFirst({
    where: and(
      eq(procurementSupplierReturns.id, id),
      eq(procurementSupplierReturns.organizationId, ctx.organizationId)
    ),
    with: { supplier: true, items: { with: { product: true, warehouse: true } } },
  });
  if (!ret) return NextResponse.json({ error: "Supplier return not found" }, { status: 404 });
  return NextResponse.json(ret);
}
