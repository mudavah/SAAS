import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchApprovalWorkflows } from "@/db/schema";
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

  const workflow = await db.query.branchApprovalWorkflows.findFirst({
    where: and(
      eq(branchApprovalWorkflows.id, id),
      eq(branchApprovalWorkflows.organizationId, ctx.organizationId)
    ),
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(workflow);
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
      .update(branchApprovalWorkflows)
      .set({
        name: body.name,
        description: body.description,
        steps: body.steps,
        isDefault: body.isDefault,
        active: body.active,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(branchApprovalWorkflows.id, id),
          eq(branchApprovalWorkflows.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.approval_workflow.update",
      category: "enterprise",
      resourceType: "branch_approval_workflow",
      resourceId: updated.id,
      description: `Updated approval workflow ${updated.name}`,
      newValues: { name: updated.name, active: updated.active },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const deleted = await db
      .delete(branchApprovalWorkflows)
      .where(
        and(
          eq(branchApprovalWorkflows.id, id),
          eq(branchApprovalWorkflows.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.approval_workflow.delete",
      category: "enterprise",
      resourceType: "branch_approval_workflow",
      resourceId: id,
      description: `Deleted approval workflow ${deleted[0].name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
