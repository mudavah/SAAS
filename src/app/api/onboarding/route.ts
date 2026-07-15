import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, users, organizations } from "@/db/schema";
import { onboardingSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import { getApiContext } from "@/lib/session";
import { getActiveOrganization, ensureUserHasOrganization } from "@/lib/org";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    let organizationId = ctx.organizationId;
    if (!organizationId) {
      const active = await getActiveOrganization(ctx.userId!);
      if (active) {
        organizationId = active.organization.id;
      } else {
        const created = await ensureUserHasOrganization(ctx.userId!);
        if (created) organizationId = created.id;
      }
    }

    await db.insert(businesses).values({
      userId: ctx.userId!,
      organizationId,
      name: parsed.data.businessName,
      type: parsed.data.businessType,
      phone: parsed.data.phone,
      city: parsed.data.city,
      currency: parsed.data.currency,
    });

    if (organizationId) {
      await db
        .update(organizations)
        .set({ name: parsed.data.businessName, updatedAt: new Date() })
        .where(eq(organizations.id, organizationId));
    }

    await db
      .update(users)
      .set({ onboardingComplete: true, updatedAt: new Date() })
      .where(eq(users.id, ctx.userId!));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Onboarding error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
