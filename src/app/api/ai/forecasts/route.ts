import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiForecasts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { forecastRequestSchema } from "@/lib/validations";
import { getRevenueForecast, getCashFlowForecast, getInventoryForecast } from "@/lib/ai/forecasting";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || undefined;
  const conditions = [eq(aiForecasts.organizationId, ctx.organizationId)];
  if (type) conditions.push(eq(aiForecasts.type, type as any));
  const rows = await db.query.aiForecasts.findMany({
    where: eq(aiForecasts.organizationId, ctx.organizationId),
    orderBy: (f: any) => [desc(f.createdAt)],
    limit: 50,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = forecastRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { type, horizon } = parsed.data;

  let result: any;
  if (type === "cash_flow") result = await getCashFlowForecast(ctx.organizationId, horizon);
  else if (type === "inventory") {
    const inv = await getInventoryForecast(ctx.organizationId);
    result = { type: "inventory", series: [], confidence: 75, summary: inv.summary, items: inv.items, model: "rules" };
  } else result = await getRevenueForecast(ctx.organizationId, horizon);

  const [stored] = await db
    .insert(aiForecasts)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      type: result.type as any,
      model: result.model || "rules",
      horizonDays: type === "inventory" ? null : horizon,
      data: { series: result.series, items: result.items },
      confidence: result.confidence,
      summary: result.summary,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "ai.forecast",
    category: "ai",
    resourceType: "ai_forecast",
    resourceId: stored.id,
    description: `Generated ${type} forecast`,
  });
  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "ai.forecast.generated",
    title: `AI ${type} forecast generated`,
    description: result.summary,
    resourceType: "ai_forecast",
    resourceId: stored.id,
  });

  return NextResponse.json({ data: { ...result, id: stored.id } });
}
