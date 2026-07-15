import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listActivity } from "@/lib/integrations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "integrations.logs.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integrationId") || undefined;
  const logs = await listActivity(ctx, {
    integrationId: integrationId,
    limit: 100,
  });
  return NextResponse.json({ data: logs });
}
