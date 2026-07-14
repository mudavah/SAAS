import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiInsights } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createInsightsForOrg, fetchBusinessMetrics } from "@/lib/ai/insights";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const rows = await db.query.aiInsights.findMany({
    where: eq(aiInsights.organizationId, ctx.organizationId),
    orderBy: (i: any) => [desc(i.createdAt)],
    limit: 100,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const insights = await createInsightsForOrg(ctx.organizationId, ctx.userId!);
  await logAuditSafe(ctx, {
    action: "ai.insights",
    category: "ai",
    resourceType: "ai_insight",
    description: `Generated ${insights.length} AI insights`,
  });
  return NextResponse.json({ data: insights });
}
