import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getTimelineStats } from "@/lib/timeline";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "timeline.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(
      Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1),
      365
    );

    const stats = await getTimelineStats(ctx.organizationId, days);
    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Timeline stats error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
