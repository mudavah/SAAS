import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementGrns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.grn.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const grns = await db.query.procurementGrns.findMany({
    where: eq(procurementGrns.organizationId, ctx.organizationId),
    orderBy: (g) => [desc(g.createdAt)],
    with: { supplier: true, purchaseOrder: true, items: { with: { product: true, warehouse: true } } },
  });
  return NextResponse.json(grns);
}
