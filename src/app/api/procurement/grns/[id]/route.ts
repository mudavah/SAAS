import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementGrns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.grn.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const grn = await db.query.procurementGrns.findFirst({
    where: and(eq(procurementGrns.id, id), eq(procurementGrns.organizationId, ctx.organizationId)),
    with: { supplier: true, purchaseOrder: true, items: { with: { product: true, warehouse: true, poItem: true } } },
  });
  if (!grn) return NextResponse.json({ error: "GRN not found" }, { status: 404 });
  return NextResponse.json(grn);
}
