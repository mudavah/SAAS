import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { etimsConfig } from "@/db/schema";
import { etimsConfigSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await db.query.etimsConfig.findFirst({
    where: eq(etimsConfig.userId, session.user.id),
  });

  return NextResponse.json(config || {});
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = etimsConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.userId, session.user.id),
    });

    if (existing) {
      const [updated] = await db
        .update(etimsConfig)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(etimsConfig.userId, session.user.id))
        .returning();

      return NextResponse.json(updated);
    }

    const [config] = await db
      .insert(etimsConfig)
      .values({
        userId: session.user.id,
        ...parsed.data,
      })
      .returning();

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Save eTIMS config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
