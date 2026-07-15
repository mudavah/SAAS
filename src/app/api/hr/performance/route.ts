import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPerformanceReviews, createPerformanceReview } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.performance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;

  const reviews = await getPerformanceReviews(ctx.organizationId, employeeId);
  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.performance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createPerformanceReview(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.review, { status: result.status });
  } catch (error) {
    logger.error("Create performance review error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
