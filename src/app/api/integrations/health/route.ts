import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getHealthDashboard, runHealthCheck } from "@/lib/integrations";
import { listIntegrations } from "@/lib/integrations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const dash = await getHealthDashboard(ctx);
  return NextResponse.json({ data: dash.entries });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await listIntegrations(ctx);
  for (const r of rows) {
    try {
      await runHealthCheck(ctx, r.id);
    } catch {
      // best-effort; continue with remaining
    }
  }
  const dash = await getHealthDashboard(ctx);
  return NextResponse.json({ data: dash.entries });
}
