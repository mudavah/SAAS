import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usageRecords } from "@/db/schema";
import { aiRequestSchema } from "@/lib/validations";
import { generateAiContent } from "@/lib/ai";
import { eq, and } from "drizzle-orm";
import { getCurrentMonth, PLAN_LIMITS, type PlanType } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const plan = (session.user.plan || "free") as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (limits.aiRequestsPerMonth !== Infinity) {
      const month = getCurrentMonth();
      const usage = await db.query.usageRecords.findFirst({
        where: and(
          eq(usageRecords.userId, session.user.id),
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
        eq(usageRecords.userId, session.user.id),
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
        userId: session.user.id,
        month,
        aiRequests: 1,
      });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
