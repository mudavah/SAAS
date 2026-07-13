import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createPurchaseRequest } from "@/lib/procurement/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.requests.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const requests = await db.query.procurementPurchaseRequests.findMany({
    where: eq(procurementPurchaseRequests.organizationId, ctx.organizationId),
    orderBy: (r) => [desc(r.createdAt)],
    with: {
      items: true,
      approvals: true,
      requester: { columns: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.requests.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createPurchaseRequest(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.request, { status: result.status });
  } catch (error) {
    console.error("Create purchase request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
