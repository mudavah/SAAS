import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiTaskRecommendations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { generateTaskRecommendations, taskNarrative } from "@/lib/ai/tasks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const rows = await db.query.aiTaskRecommendations.findMany({
    where: eq(aiTaskRecommendations.organizationId, ctx.organizationId),
    orderBy: (t: any) => [desc(t.createdAt)],
    limit: 100,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const recs = await generateTaskRecommendations(ctx.organizationId, ctx.userId!);
  await logAuditSafe(ctx, {
    action: "ai.task_recommend",
    category: "ai",
    resourceType: "ai_task_recommendation",
    description: `Generated ${recs.length} task recommendations`,
  });
  const narrative = await taskNarrative(recs as any);
  return NextResponse.json({ data: { recommendations: recs, narrative } });
}
