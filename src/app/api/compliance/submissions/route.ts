import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getSubmissionCounts, getComplianceAnalytics } from "@/lib/compliance/analytics";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")));

  const counts = await getSubmissionCounts(ctx.organizationId);
  const analytics = await getComplianceAnalytics(ctx.organizationId, 6);

  return NextResponse.json({
    counts,
    successRate: analytics.successRate,
    avgProcessingTimeMs: analytics.avgProcessingTimeMs,
    failureReasons: analytics.failureReasons,
    trend: analytics.trend,
    simulatedCount: analytics.simulatedCount,
    lastSubmissionAt: analytics.lastSubmissionAt,
  });
}
