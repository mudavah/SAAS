import { NextResponse } from "next/server";
import { db } from "@/db";
import { automationWorkflows } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { emitTimelineEvent } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "automation.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const wf = await db.query.automationWorkflows.findFirst({
    where: and(eq(automationWorkflows.id, id), eq(automationWorkflows.organizationId, ctx.organizationId)),
    columns: { id: true, name: true, status: true },
  });
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const next = wf.status === "active" ? "paused" : "active";
  await db
    .update(automationWorkflows)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(automationWorkflows.id, id));

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "automation.workflow.updated",
    title: `Workflow ${next}: ${wf.name}`,
    resourceType: "automation_workflow",
    resourceId: id,
  });

  return NextResponse.json({ data: { id, status: next } });
}
