import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { onboardingSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await db.insert(businesses).values({
      userId: session.user.id,
      name: parsed.data.businessName,
      type: parsed.data.businessType,
      phone: parsed.data.phone,
      city: parsed.data.city,
      currency: parsed.data.currency,
    });

    await db
      .update(users)
      .set({ onboardingComplete: true, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
