import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.userId, session.user.id)),
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
