import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listApprovalRequests } from "@/lib/automation/approval";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "approvals.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const resourceType = searchParams.get("resourceType") || undefined;
  const rows = await listApprovalRequests(ctx.organizationId, { status, resourceType });
  return NextResponse.json({ data: rows });
}
