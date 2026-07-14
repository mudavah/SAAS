import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { runDueScheduledWorkflows } from "@/lib/automation/scheduler";
import { emitTimelineEvent } from "@/lib/timeline";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: runs all due schedule-triggered workflows. Intended to be hit
 * every minute by an external scheduler (cron job, Vercel Cron, etc.). Gated by
 * `automation.manage` so only privileged callers can invoke it.
 */
export async function POST(req: Request) {
  const res = await requireApiContext(req, "automation.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const results = await runDueScheduledWorkflows();
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "automation.scheduled.run",
      title: `Scheduled automations run (${results.length})`,
      description: results.map((r) => `${r.workflowId}:${r.status}`).join(", "),
    });
    return NextResponse.json({ data: { ran: results.length, results } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scheduled run failed" },
      { status: 500 }
    );
  }
}
