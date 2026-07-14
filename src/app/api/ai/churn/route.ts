import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiChurnPredictions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { predictClientChurn, churnNarrative } from "@/lib/ai/churn";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const regenerate = searchParams.get("regenerate") === "true";

  let rows = await db.query.aiChurnPredictions.findMany({
    where: eq(aiChurnPredictions.organizationId, ctx.organizationId),
    orderBy: (c: any) => [desc(c.score)],
    limit: 100,
  });

  if (regenerate || rows.length === 0) {
    const predictions = await predictClientChurn(ctx.organizationId);
    rows = predictions as any;
    await logAuditSafe(ctx, {
      action: "ai.churn",
      category: "ai",
      resourceType: "ai_churn_prediction",
      description: `Predicted churn for ${predictions.length} customers`,
    });
    await emitTimelineEvent({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventType: "ai.churn.predicted",
      title: `Churn predictions refreshed (${predictions.length})`,
      resourceType: "ai_churn_prediction",
    });
  }

  const narrative = await churnNarrative(rows as any);
  return NextResponse.json({ data: { predictions: rows, narrative } });
}
