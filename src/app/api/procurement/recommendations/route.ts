import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementAiRecommendations } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { generateRecommendations, getOpenRecommendations, updateRecommendationStatus } from "@/lib/procurement/recommendations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const recs = await getOpenRecommendations(ctx.organizationId);
  return NextResponse.json(recs);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  // Regenerate fresh low-stock recommendations.
  const recs = await generateRecommendations(ctx.organizationId, ctx.userId);
  return NextResponse.json(recs);
}

export async function PATCH(req: Request) {
  const res = await requireApiContext(req, "purchasing.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !["open", "dismissed", "applied"].includes(status))
      return NextResponse.json({ error: "id and valid status are required" }, { status: 400 });
    const updated = await updateRecommendationStatus(ctx.organizationId, id, status);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update recommendation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
