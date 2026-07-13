import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  procurementApprovals,
  procurementPurchaseRequests,
  procurementPurchaseOrders,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.approve");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const approvals = await db.query.procurementApprovals.findMany({
    where: and(
      eq(procurementApprovals.organizationId, ctx.organizationId),
      eq(procurementApprovals.status, "pending")
    ),
    orderBy: (a) => [a.level],
  });

  // Only surface approvals the caller's role is allowed to act on.
  const relevant = approvals.filter((a) => a.requiredRoleType === ctx.roleType);

  const items = await Promise.all(
    relevant.map(async (a) => {
      let number = a.resourceId;
      let title = "";
      if (a.resourceType === "purchase_request") {
        const r = await db.query.procurementPurchaseRequests.findFirst({
          where: eq(procurementPurchaseRequests.id, a.resourceId),
          columns: { requestNumber: true, title: true, totalEstimated: true },
        });
        number = r?.requestNumber ?? a.resourceId;
        title = r?.title ?? "";
      } else if (a.resourceType === "purchase_order") {
        const o = await db.query.procurementPurchaseOrders.findFirst({
          where: eq(procurementPurchaseOrders.id, a.resourceId),
          columns: { poNumber: true, total: true },
        });
        number = o?.poNumber ?? a.resourceId;
        title = o ? `Purchase Order ${o.poNumber}` : "";
      }
      return { ...a, resourceNumber: number, resourceTitle: title };
    })
  );

  return NextResponse.json(items);
}
