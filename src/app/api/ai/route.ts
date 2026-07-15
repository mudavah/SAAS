import { NextResponse } from "next/server";
import { db } from "@/db";
import { usageRecords } from "@/db/schema";
import { aiRequestSchema } from "@/lib/validations";
import { generateAiContent } from "@/lib/ai";
import { eq, and } from "drizzle-orm";
import { getCurrentMonth, PLAN_LIMITS, type PlanType } from "@/lib/utils";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const plan = (ctx.organization.plan || "free") as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (limits.aiRequestsPerMonth !== Infinity) {
      const month = getCurrentMonth();
      const usage = await db.query.usageRecords.findFirst({
        where: and(
          eq(usageRecords.organizationId, ctx.organizationId),
          eq(usageRecords.month, month)
        ),
      });

      if (usage && usage.aiRequests >= limits.aiRequestsPerMonth) {
        return NextResponse.json(
          { error: "AI request limit reached. Upgrade to Pro." },
          { status: 403 }
        );
      }
    }

    const content = await generateAiContent(parsed.data);

    const month = getCurrentMonth();
    const existingUsage = await db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.organizationId, ctx.organizationId),
        eq(usageRecords.month, month)
      ),
    });

    if (existingUsage) {
      await db
        .update(usageRecords)
        .set({ aiRequests: existingUsage.aiRequests + 1 })
        .where(eq(usageRecords.id, existingUsage.id));
    } else {
      await db.insert(usageRecords).values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        month,
        aiRequests: 1,
      });
    }

    await logAuditSafe(ctx, {
      action: "ai.request",
      category: "ai",
      resourceType: "ai_request",
      description: `AI request: ${parsed.data.type}`,
      newValues: { type: parsed.data.type },
    });

    return NextResponse.json({ content });
  } catch (error) {
    logger.error("AI error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
