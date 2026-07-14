import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { decideApprovalRequest } from "@/lib/enterprise/branch-management";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.approvals.approve");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;
  const request = await decideApprovalRequest(
    ctx.organizationId,
    id,
    "reject",
    ctx.userId!
  );
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  return NextResponse.json(request);
}
