import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseRequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.requests.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const request = await db.query.procurementPurchaseRequests.findFirst({
    where: and(
      eq(procurementPurchaseRequests.id, id),
      eq(procurementPurchaseRequests.organizationId, ctx.organizationId)
    ),
    with: {
      items: { with: { product: true } },
      approvals: true,
      requester: { columns: { id: true, name: true, email: true } },
    },
  });
  if (!request) return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
  return NextResponse.json(request);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.requests.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const request = await db.query.procurementPurchaseRequests.findFirst({
    where: and(
      eq(procurementPurchaseRequests.id, id),
      eq(procurementPurchaseRequests.organizationId, ctx.organizationId)
    ),
  });
  if (!request) return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
  if (request.status !== "draft")
    return NextResponse.json({ error: "Only draft requests can be deleted" }, { status: 400 });

  await db
    .delete(procurementPurchaseRequests)
    .where(eq(procurementPurchaseRequests.id, id));

  await logAuditSafe(ctx, {
    action: "procurement.request.delete",
    category: "purchasing",
    resourceType: "procurement_purchase_request",
    resourceId: id,
    description: `Deleted purchase request ${request.requestNumber}`,
  });
  return NextResponse.json({ success: true });
}
