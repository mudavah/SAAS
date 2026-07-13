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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { orgId?: string | null }).orgId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const conversation = await db.query.aiConversations.findFirst({
    where: and(
      eq(aiConversations.id, id),
      eq(aiConversations.userId, session.user.id),
      eq(aiConversations.organizationId, orgId)
    ),
    with: {
      messages: {
        orderBy: [desc(aiMessages.createdAt)],
      },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ conversation });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { orgId?: string | null }).orgId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

  await db.update(aiConversations).set({ status: "archived" }).where(and(
     eq(aiConversations.id, id),
    eq(aiConversations.userId, session.user.id),
    eq(aiConversations.organizationId, orgId)
  ));

  return NextResponse.json({ success: true });
}
