import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { clientSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { PLAN_LIMITS, type PlanType } from "@/lib/utils";
import { count } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClients = await db.query.clients.findMany({
    where: eq(clients.userId, session.user.id),
    orderBy: (clients, { desc }) => [desc(clients.createdAt)],
  });

  return NextResponse.json(userClients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const plan = (session.user.plan || "free") as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (limits.clients !== Infinity) {
      const [result] = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.userId, session.user.id));

      if (result.count >= limits.clients) {
        return NextResponse.json(
          { error: `Free plan limit reached (${limits.clients} clients). Upgrade to Pro.` },
          { status: 403 }
        );
      }
    }

    const [client] = await db
      .insert(clients)
      .values({
        userId: session.user.id,
        ...parsed.data,
        email: parsed.data.email || null,
      })
      .returning();

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
