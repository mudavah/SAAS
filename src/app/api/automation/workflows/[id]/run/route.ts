import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { runWorkflowNow } from "@/lib/automation/scheduler";
import { loadWorkflow } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "automation.execute");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const result = await runWorkflowNow(ctx, id);
    await logAuditSafe(ctx, {
      action: "automation.workflow.run",
      category: "ai",
      resourceType: "automation_workflow",
      resourceId: id,
      description: `Manually ran workflow (status: ${result.status})`,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run workflow" },
      { status: 400 }
    );
  }
}
