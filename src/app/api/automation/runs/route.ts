import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listRuns } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "automation.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get("workflowId") || undefined;
  const rows = await listRuns(ctx.organizationId, { workflowId, limit: 100 });
  return NextResponse.json({ data: rows });
}
