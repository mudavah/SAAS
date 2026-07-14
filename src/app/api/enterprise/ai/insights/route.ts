import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getAiInsights } from "@/lib/enterprise-analytics/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const data = await getAiInsights(ctx.organizationId);
  return NextResponse.json({ data });
}
