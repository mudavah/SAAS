import { NextResponse } from "next/server";
import { db } from "@/db";
import { automationWorkflows, automationActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { automationWorkflowSchema } from "@/lib/validations";
import { loadWorkflow } from "@/lib/automation/engine";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "automation.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;
  const wf = await loadWorkflow(ctx.organizationId, id);
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  return NextResponse.json({ data: wf });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "automation.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const existing = await db.query.automationWorkflows.findFirst({
    where: and(eq(automationWorkflows.id, id), eq(automationWorkflows.organizationId, ctx.organizationId)),
  });
  if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const parsed = automationWorkflowSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const body = parsed.data;

  await db
    .update(automationWorkflows)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(automationWorkflows.id, id));

  if (body.actions) {
    await db.delete(automationActions).where(eq(automationActions.workflowId, id));
    if (body.actions.length) {
      await db.insert(automationActions).values(
        body.actions.map((a, idx) => ({
          workflowId: id,
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          order: a.order ?? idx,
          type: a.type,
          name: a.name ?? null,
          config: a.config,
          conditions: a.conditions,
        }))
      );
    }
  }

  await logAuditSafe(ctx, {
    action: "automation.workflow.update",
    category: "ai",
    resourceType: "automation_workflow",
    resourceId: id,
    description: `Updated workflow ${existing.name}`,
  });
  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "automation.workflow.updated",
    title: `Workflow updated: ${existing.name}`,
    resourceType: "automation_workflow",
    resourceId: id,
  });

  return NextResponse.json({ data: { id } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "automation.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const existing = await db.query.automationWorkflows.findFirst({
    where: and(eq(automationWorkflows.id, id), eq(automationWorkflows.organizationId, ctx.organizationId)),
    columns: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  await db.delete(automationActions).where(eq(automationActions.workflowId, id));
  await db.delete(automationWorkflows).where(eq(automationWorkflows.id, id));

  await logAuditSafe(ctx, {
    action: "automation.workflow.delete",
    category: "ai",
    resourceType: "automation_workflow",
    resourceId: id,
    description: `Deleted workflow ${existing.name}`,
  });
  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "automation.workflow.deleted",
    title: `Workflow deleted: ${existing.name}`,
    resourceType: "automation_workflow",
    resourceId: id,
  });

  return NextResponse.json({ data: { id } });
}
