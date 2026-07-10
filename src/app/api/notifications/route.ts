import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications as notificationsTable } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import {
  getApiContext,
} from "@/lib/session";
import {
  markNotificationRead,
  archiveNotification,
} from "@/lib/notifications";

export async function GET() {
  const session = await (await import("@/lib/auth")).auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.notifications.findMany({
    where: eq(notificationsTable.userId, session.user.id),
    orderBy: [desc(notificationsTable.createdAt)],
    limit: 50,
  });

  return NextResponse.json({ notifications: rows });
}

export async function POST(req: NextRequest) {
  const session = await (await import("@/lib/auth")).auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { notificationId, action } = body as { notificationId?: string; action?: "read" | "archive" };

  if (!notificationId || !action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const target = await db.query.notifications.findFirst({
    where: and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, session.user.id)),
  });

  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "read") {
    await markNotificationRead(target.id, session.user.id);
  } else if (action === "archive") {
    await archiveNotification(target.id, session.user.id);
  }

  return NextResponse.json({ success: true });
}
