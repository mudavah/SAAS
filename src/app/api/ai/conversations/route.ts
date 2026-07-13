import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { orgId?: string | null }).orgId;
  if (!orgId) return NextResponse.json({ conversations: [] });

  const rows = await db.select().from(aiConversations).where(and(
    eq(aiConversations.userId, session.user.id),
    eq(aiConversations.organizationId, orgId)
  )).orderBy(desc(aiConversations.updatedAt)).limit(50);

  return NextResponse.json({ conversations: rows });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { orgId?: string | null }).orgId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.slice(0, 120) : "New conversation";

  const [conversation] = await db.insert(aiConversations).values({
    userId: session.user.id,
    organizationId: orgId,
    title,
    status: "active",
  }).returning();

  return NextResponse.json({ conversation }, { status: 201 });
}
