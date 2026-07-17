import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getSubmissionCounts, getComplianceAnalytics } from "@/lib/compliance/analytics";
import { listSubmissions } from "@/lib/compliance/engine";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")));

  const [counts, analytics, submissions] = await Promise.all([
    getSubmissionCounts(ctx.organizationId),
    getComplianceAnalytics(ctx.organizationId, 6),
    listSubmissions(ctx.organizationId, { status, page, limit }),
  ]);

  return NextResponse.json({
    counts,
    successRate: analytics.successRate,
    avgProcessingTimeMs: analytics.avgProcessingTimeMs,
    failureReasons: analytics.failureReasons,
    trend: analytics.trend,
    simulatedCount: analytics.simulatedCount,
    lastSubmissionAt: analytics.lastSubmissionAt,
    submissions,
  });
}
