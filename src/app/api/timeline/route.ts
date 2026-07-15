import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listTimelineEvents } from "@/lib/timeline";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "timeline.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const eventType = searchParams.get("eventType");
    const resourceType = searchParams.get("resourceType");
    const search = searchParams.get("search");

    const startDateRaw = searchParams.get("startDate");
    const endDateRaw = searchParams.get("endDate");
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;

    const result = await listTimelineEvents(ctx.organizationId, {
      page,
      limit,
      eventType,
      resourceType,
      search,
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Timeline fetch error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
