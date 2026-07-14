import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchApprovalRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.approvals.approve");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const [updated] = await db
      .update(branchApprovalRequests)
      .set({
        status: "approved",
        decidedBy: ctx.userId,
        decidedAt: new Date(),
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
      action: "enterprise.approval_request.approve",
      category: "enterprise",
      resourceType: "branch_approval_request",
      resourceId: updated.id,
      description: `Approved request ${updated.title}`,
      newValues: { status: "approved" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approve request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
