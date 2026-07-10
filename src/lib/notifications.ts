/**
 * KaziFlow — notification center
 * ------------------------------------------------------------------
 * In-app notifications with optional email delivery, per-user preferences,
 * read/unread/archive state, priority, and deep links. Notifications are
 * organization-scoped. When no `userId` is given the notification is fanned
 * out to every active member of the organization (each gets their own read
 * state and preference check).
 */
import { db } from "@/db";
import {
  notifications,
  notificationPreferences,
  organizationMembers,
  organizations,
  users,
  type NotificationCategory,
  type NotificationPriority,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sendNotificationEmail } from "@/lib/email";

export interface CreateNotificationInput {
  organizationId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  deepLink?: string | null;
  metadata?: Record<string, unknown>;
  /** Specific recipient. Omit to broadcast to all active members. */
  userId?: string | null;
}

const DEFAULT_CHANNELS = {
  inApp: true,
  email: false,
  push: false,
  sms: false,
};

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  const priority = input.priority ?? "normal";

  if (input.userId) {
    await insertAndDeliver({
      organizationId: input.organizationId,
      userId: input.userId,
      category: input.category,
      type: input.type,
      title: input.title,
      message: input.message,
      priority,
      deepLink: input.deepLink ?? null,
      metadata: input.metadata,
    });
    return;
  }

  // Broadcast: fan out to all active members.
  const members = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.organizationId, input.organizationId),
      eq(organizationMembers.status, "active")
    ),
    with: { user: true },
  });

  for (const member of members) {
    if (!member.userId) continue;
    await insertAndDeliver({
      organizationId: input.organizationId,
      userId: member.userId,
      category: input.category,
      type: input.type,
      title: input.title,
      message: input.message,
      priority,
      deepLink: input.deepLink ?? null,
      metadata: input.metadata,
    });
  }
}

async function insertAndDeliver(row: {
  organizationId: string;
  userId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  deepLink: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const [created] = await db.insert(notifications).values(row).returning();

  // Respect the recipient's notification preferences for the channel.
  const prefs = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.organizationId, row.organizationId),
      eq(notificationPreferences.userId, row.userId),
      eq(notificationPreferences.category, row.category)
    ),
  });

  const channels = prefs
    ? {
        inApp: prefs.inApp,
        email: prefs.email,
        push: prefs.push,
        sms: prefs.sms,
      }
    : DEFAULT_CHANNELS;

  if (channels.email) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, row.userId),
      columns: { email: true, name: true },
    });
    if (user?.email) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, row.organizationId),
        columns: { name: true },
      });
      await sendNotificationEmail({
        to: user.email,
        title: row.title,
        message: row.message,
        category: row.category,
        deepLink: row.deepLink,
        orgName: org?.name,
      });
    }
  }
  // push / sms are future-ready: hooks can be added here without schema change.
  void channels.push;
  void channels.sms;
}

export async function markNotificationRead(
  id: string,
  userId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(
  organizationId: string,
  userId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      )
    );
}

export async function archiveNotification(
  id: string,
  userId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ archived: true, read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function getUnreadCount(
  organizationId: string,
  userId: string
): Promise<number> {
  const rows = await db
    .select({ count: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
        eq(notifications.read, false),
        eq(notifications.archived, false)
      )
    );
  return rows.length;
}

export async function listNotifications(
  organizationId: string,
  userId: string,
  opts: { unreadOnly?: boolean; category?: NotificationCategory; limit?: number } = {}
): Promise<(typeof notifications.$inferSelect)[]> {
  const conditions = [
    eq(notifications.organizationId, organizationId),
    eq(notifications.userId, userId),
    eq(notifications.archived, false),
  ];
  if (opts.unreadOnly) conditions.push(eq(notifications.read, false));
  if (opts.category) conditions.push(eq(notifications.category, opts.category));

  return db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: (n) => [desc(n.createdAt)],
    limit: opts.limit ?? 50,
  });
}

/** Return preferences for every category, filling defaults for missing ones. */
export async function getNotificationPreferences(
  organizationId: string,
  userId: string
): Promise<Record<string, typeof DEFAULT_CHANNELS>> {
  const rows = await db.query.notificationPreferences.findMany({
    where: and(
      eq(notificationPreferences.organizationId, organizationId),
      eq(notificationPreferences.userId, userId)
    ),
  });

  const byCategory: Record<string, typeof DEFAULT_CHANNELS> = {};
  for (const r of rows) {
    byCategory[r.category] = {
      inApp: r.inApp,
      email: r.email,
      push: r.push,
      sms: r.sms,
    };
  }
  return byCategory;
}

export async function setNotificationPreference(
  organizationId: string,
  userId: string,
  category: NotificationCategory,
  channels: Partial<typeof DEFAULT_CHANNELS>
): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({
      organizationId,
      userId,
      category,
      inApp: channels.inApp ?? true,
      email: channels.email ?? false,
      push: channels.push ?? false,
      sms: channels.sms ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        notificationPreferences.organizationId,
        notificationPreferences.userId,
        notificationPreferences.category,
      ],
      set: {
        inApp: channels.inApp ?? true,
        email: channels.email ?? false,
        push: channels.push ?? false,
        sms: channels.sms ?? false,
        updatedAt: new Date(),
      },
    });
}
