import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchApprovalRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const request = await db.query.branchApprovalRequests.findFirst({
    where: and(
      eq(branchApprovalRequests.id, id),
      eq(branchApprovalRequests.organizationId, ctx.organizationId)
    ),
  });

  if (!request) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  }

  return NextResponse.json(request);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    const [updated] = await db
      .update(branchApprovalRequests)
      .set({
        title: body.title,
        status: body.status,
        currentStep: body.currentStep,
        payload: body.payload,
        decidedBy: body.decidedBy,
        decidedAt: body.decidedAt ? new Date(body.decidedAt) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(branchApprovalRequests.id, id),
          eq(branchApprovalRequests.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.approval_request.update",
      category: "enterprise",
      resourceType: "branch_approval_request",
      resourceId: updated.id,
      description: `Updated approval request ${updated.title}`,
      newValues: { status: updated.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update approval request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
