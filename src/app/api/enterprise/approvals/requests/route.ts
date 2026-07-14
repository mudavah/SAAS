import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchApprovalRequests } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const requests = await db.query.branchApprovalRequests.findMany({
    where: eq(branchApprovalRequests.organizationId, ctx.organizationId),
    orderBy: [desc(branchApprovalRequests.createdAt)],
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "enterprise.approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (!body.branchId || !body.resourceType || !body.title) {
      return NextResponse.json(
        { error: "branchId, resourceType, and title are required" },
        { status: 400 }
      );
    }

    const [request] = await db
      .insert(branchApprovalRequests)
      .values({
        organizationId: ctx.organizationId,
        branchId: body.branchId,
        workflowId: body.workflowId,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        title: body.title,
        status: body.status || "pending",
        currentStep: body.currentStep || 0,
        payload: body.payload || {},
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.approval_request.create",
      category: "enterprise",
      resourceType: "branch_approval_request",
      resourceId: request.id,
      description: `Created approval request ${request.title}`,
      newValues: { title: request.title, resourceType: request.resourceType },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Create approval request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
