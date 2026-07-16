import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getTimelineStats, listTimelineEvents } from "@/lib/timeline";
import { generateAiContentDetailed } from "@/lib/ai";
import { logger } from "@/lib/logger";

/**
 * GET /api/timeline/summary?days=30
 * Produces an AI-generated executive summary of the organization's recent
 * business activity, backed by real timeline stats. Falls back to a plain text
 * summary when the AI provider is unavailable.
 */
export async function GET(req: Request) {
  const res = await requireApiContext(req, "timeline.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1), 90);

  try {
    const stats = await getTimelineStats(ctx.organizationId, days);
    const { data: recent } = await listTimelineEvents(ctx.organizationId, {
      page: 1,
      limit: 25,
    });

    const breakdown = stats.byEventType
      .map((s) => `- ${s.eventType}: ${s.count}`)
      .join("\n");

    const highlights = recent
      .slice(0, 8)
      .map((e) => `• ${e.title} (${e.eventType})`)
      .join("\n");

    const context = [
      `Organization had ${stats.total} business events in the last ${days} days.`,
      `Breakdown by type:\n${breakdown}`,
      `Recent highlights:\n${highlights}`,
    ].join("\n\n");

    const summary = await generateAiContentDetailed({
      type: "business_insights",
      tone: "professional",
      context,
    });

    return NextResponse.json({
      summary: summary.content,
      generatedFromCache: summary.cached,
      stats: {
        total: stats.total,
        since: stats.since,
        byEventType: stats.byEventType,
      },
    });
  } catch (error) {
    logger.error("Timeline summary error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
