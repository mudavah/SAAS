import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchApprovalWorkflows } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const workflows = await db.query.branchApprovalWorkflows.findMany({
    where: eq(branchApprovalWorkflows.organizationId, ctx.organizationId),
    orderBy: [desc(branchApprovalWorkflows.createdAt)],
  });

  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "enterprise.approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (!body.branchId || !body.name || !body.resourceType) {
      return NextResponse.json(
        { error: "branchId, name, and resourceType are required" },
        { status: 400 }
      );
    }

    const [workflow] = await db
      .insert(branchApprovalWorkflows)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        branchId: body.branchId,
        name: body.name,
        description: body.description,
        resourceType: body.resourceType,
        steps: body.steps || [],
        isDefault: body.isDefault || false,
        active: body.active ?? true,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.approval_workflow.create",
      category: "enterprise",
      resourceType: "branch_approval_workflow",
      resourceId: workflow.id,
      description: `Created approval workflow ${workflow.name}`,
      newValues: { name: workflow.name, branchId: body.branchId },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    logger.error("Create workflow error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
