import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getCrmAnalytics } from "@/lib/enterprise-analytics/metrics";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "analytics.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate") ? new Date(url.searchParams.get("startDate")!) : undefined;
  const endDate = url.searchParams.get("endDate") ? new Date(url.searchParams.get("endDate")!) : undefined;

  const data = await getCrmAnalytics(ctx.organizationId, startDate, endDate);
  return NextResponse.json(data);
}
