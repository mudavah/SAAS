import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementRfqs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.rfq.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const rfq = await db.query.procurementRfqs.findFirst({
    where: and(eq(procurementRfqs.id, id), eq(procurementRfqs.organizationId, ctx.organizationId)),
    with: {
      items: { with: { product: true } },
      suppliers: { with: { supplier: true } },
      quotations: { with: { supplier: true, items: true } },
    },
  });
  if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  return NextResponse.json(rfq);
}
