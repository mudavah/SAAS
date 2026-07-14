import { NextResponse } from "next/server";
import { db } from "@/db";
import { approvalWorkflows } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { approvalWorkflowSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "approvals.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const rows = await db.query.approvalWorkflows.findMany({
    where: eq(approvalWorkflows.organizationId, ctx.organizationId),
    orderBy: (w: any) => [desc(w.createdAt)],
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "approvals.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = approvalWorkflowSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const body = parsed.data;

  const [wf] = await db
    .insert(approvalWorkflows)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name: body.name,
      description: body.description ?? null,
      resourceType: body.resourceType,
      steps: body.steps,
      isDefault: body.isDefault,
      active: body.active,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "approval.workflow.create",
    category: "ai",
    resourceType: "approval_workflow",
    resourceId: wf.id,
    description: `Created approval workflow ${wf.name}`,
    newValues: { resourceType: body.resourceType, steps: body.steps.length },
  });
  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "approval.workflow.created",
    title: `Approval workflow created: ${wf.name}`,
    description: `${body.steps.length} step(s)`,
    resourceType: "approval_workflow",
    resourceId: wf.id,
  });

  return NextResponse.json({ data: wf }, { status: 201 });
}
