import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getBranchPerformance } from "@/lib/enterprise-analytics/metrics";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.reports.view");
  if ("error" in res) return res.error;
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const data = await getBranchPerformance(
    res.ctx.organizationId,
    start ? new Date(start) : undefined,
    end ? new Date(end) : undefined
  );
  return NextResponse.json(data);
}
