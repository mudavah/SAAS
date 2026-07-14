import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiQueryLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { nlQuerySchema } from "@/lib/validations";
import { answerBusinessQuery } from "@/lib/ai/nl-query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const rows = await db.query.aiQueryLogs.findMany({
    where: eq(aiQueryLogs.organizationId, ctx.organizationId),
    orderBy: (q: any) => [desc(q.createdAt)],
    limit: 50,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = nlQuerySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const result = await answerBusinessQuery(ctx.organizationId, parsed.data.query);

  await db.insert(aiQueryLogs).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId!,
    query: result.query,
    intent: result.intent,
    entities: result.entities,
    plan: result.plan,
    answer: result.answer,
    model: result.model,
  });

  await logAuditSafe(ctx, {
    action: "ai.nl_query",
    category: "ai",
    resourceType: "ai_query_log",
    description: `NL query: ${result.intent}`,
  });
  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "ai.nl_query.executed",
    title: `Business question answered: ${result.intent}`,
    description: result.query.slice(0, 120),
  });

  return NextResponse.json({ data: result });
}
