import { NextResponse } from "next/server";
import { db } from "@/db";
import { approvalWorkflows } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { approvalWorkflowSchema } from "@/lib/validations";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "approvals.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;
  const wf = await db.query.approvalWorkflows.findFirst({
    where: and(eq(approvalWorkflows.id, id), eq(approvalWorkflows.organizationId, ctx.organizationId)),
  });
  if (!wf) return NextResponse.json({ error: "Approval workflow not found" }, { status: 404 });
  return NextResponse.json({ data: wf });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const existing = await db.query.approvalWorkflows.findFirst({
    where: and(eq(approvalWorkflows.id, id), eq(approvalWorkflows.organizationId, ctx.organizationId)),
    columns: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Approval workflow not found" }, { status: 404 });

  const parsed = approvalWorkflowSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  await db
    .update(approvalWorkflows)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(approvalWorkflows.id, id));

  await logAuditSafe(ctx, {
    action: "approval.workflow.update",
    category: "ai",
    resourceType: "approval_workflow",
    resourceId: id,
    description: "Updated approval workflow",
  });

  return NextResponse.json({ data: { id } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const existing = await db.query.approvalWorkflows.findFirst({
    where: and(eq(approvalWorkflows.id, id), eq(approvalWorkflows.organizationId, ctx.organizationId)),
    columns: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Approval workflow not found" }, { status: 404 });

  await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, id));
  await logAuditSafe(ctx, {
    action: "approval.workflow.delete",
    category: "ai",
    resourceType: "approval_workflow",
    resourceId: id,
    description: "Deleted approval workflow",
  });
  return NextResponse.json({ data: { id } });
}
