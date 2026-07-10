import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications as notificationsTable } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getApiContext } from "@/lib/session";
import {
  markNotificationRead,
  archiveNotification,
} from "@/lib/notifications";

export async function GET(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.notifications.findMany({
    where: and(
      eq(notificationsTable.userId, ctx.userId!),
      eq(notificationsTable.organizationId, ctx.organizationId)
    ),
    orderBy: [desc(notificationsTable.createdAt)],
    limit: 50,
  });

  return NextResponse.json({ notifications: rows });
}

export async function POST(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { notificationId, action } = body as { notificationId?: string; action?: "read" | "archive" };

  if (!notificationId || !action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const target = await db.query.notifications.findFirst({
    where: and(
      eq(notificationsTable.id, notificationId),
      eq(notificationsTable.userId, ctx.userId!),
      eq(notificationsTable.organizationId, ctx.organizationId)
    ),
  });

  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "read") {
    await markNotificationRead(target.id, ctx.userId!);
  } else if (action === "archive") {
    await archiveNotification(target.id, ctx.userId!);
  }

  return NextResponse.json({ success: true });
}
