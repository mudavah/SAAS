import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listActivity } from "@/lib/integrations/activity";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.logs.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")) || 50;

  const logs = await listActivity(ctx, { integrationId: id, limit });
  return NextResponse.json({ data: logs });
}
