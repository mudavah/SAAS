import { NextResponse } from "next/server";
import { db } from "@/db";
import { automationWorkflows, automationActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { automationWorkflowSchema } from "@/lib/validations";
import { listWorkflows } from "@/lib/automation/engine";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "automation.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const rows = await listWorkflows(ctx.organizationId, { status });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "automation.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = automationWorkflowSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const body = parsed.data;
  const [wf] = await db
    .insert(automationWorkflows)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig,
      conditions: body.conditions,
    })
    .returning();

  if (body.actions.length) {
    await db.insert(automationActions).values(
      body.actions.map((a, idx) => ({
        workflowId: wf.id,
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

  await logAuditSafe(ctx, {
    action: "automation.workflow.create",
    category: "ai",
    resourceType: "automation_workflow",
    resourceId: wf.id,
    description: `Created workflow ${wf.name}`,
    newValues: { triggerType: body.triggerType, actions: body.actions.length },
  });
  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "automation.workflow.created",
    title: `Workflow created: ${wf.name}`,
    description: `${body.actions.length} action(s)`,
    resourceType: "automation_workflow",
    resourceId: wf.id,
  });

  return NextResponse.json({ data: wf }, { status: 201 });
}
