/**
 * KaziFlow — Customer Success service
 * ------------------------------------------------------------------
 * Support tickets, feature requests, feedback, knowledge base and in-app
 * announcements. Org-scoped where applicable; public submissions (feedback,
 * support from non-authenticated visitors) are allowed for global rows.
 */
import { db } from "@/db";
import {
  supportTickets,
  featureRequests,
  customerFeedback,
  knowledgeBaseArticles,
  announcements,
  users,
} from "@/db/schema";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { logAuditSafe } from "@/lib/audit";

// ── Support tickets ─────────────────────────────────────────────────────────
export async function listTickets(ctx: any, filters: { status?: string } = {}) {
  requireApiContext;
  const where = and(
    filters.status ? eq(supportTickets.status, filters.status as any) : undefined,
    ctx.organizationId
      ? eq(supportTickets.organizationId, ctx.organizationId)
      : undefined
  );
  return db.query.supportTickets.findMany({
    where,
    orderBy: (t) => [desc(t.createdAt)],
    with: { user: { columns: { id: true, name: true, email: true } } },
  });
}

export async function createTicket(input: {
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string;
  subject: string;
  description: string;
  priority?: string;
  category?: string;
}) {
  const [row] = await db
    .insert(supportTickets)
    .values({
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      subject: input.subject,
      description: input.description,
      priority: (input.priority as any) ?? "normal",
      category: input.category ?? "general",
      status: "open",
    })
    .returning();
  if (input.organizationId) {
    await createNotification({
      organizationId: input.organizationId,
      category: "subscriptions",
      type: "ticket_created",
      title: "New support ticket",
      message: row.subject ?? "New support ticket submitted",
      deepLink: "/dashboard/support",
    }).catch(() => undefined);
  }
  return row;
}

export async function updateTicket(ctx: any, id: string, patch: Partial<{ status: string; assigneeId: string }>) {
  const [row] = await db
    .update(supportTickets)
    .set({ ...(patch as Record<string, unknown>), updatedAt: new Date() })
    .where(and(eq(supportTickets.id, id), eq(supportTickets.organizationId, ctx.organizationId)))
    .returning();
  return row;
}

// ── Feature requests ─────────────────────────────────────────────────────────
export async function listFeatureRequests(ctx: any) {
  return db.query.featureRequests.findMany({
    where: ctx.organizationId ? eq(featureRequests.organizationId, ctx.organizationId) : undefined,
    orderBy: (t) => [desc(t.votes), desc(t.createdAt)],
  });
}

export async function createFeatureRequest(input: {
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string;
  title: string;
  description: string;
}) {
  const [row] = await db
    .insert(featureRequests)
    .values({
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      title: input.title,
      description: input.description,
      status: "under_review",
      votes: 1,
    })
    .returning();
  return row;
}

export async function voteFeatureRequest(ctx: any, id: string) {
  const [row] = await db
    .update(featureRequests)
    .set({ votes: sql`${featureRequests.votes} + 1`, updatedAt: new Date() })
    .where(eq(featureRequests.id, id))
    .returning();
  return row;
}

// ── Feedback ────────────────────────────────────────────────────────────────
export async function createFeedback(input: {
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string;
  rating?: number;
  message: string;
  page?: string;
}) {
  const [row] = await db
    .insert(customerFeedback)
    .values({
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      rating: input.rating ?? null,
      message: input.message,
      page: input.page ?? null,
    })
    .returning();
  return row;
}

// ── Knowledge base ──────────────────────────────────────────────────────────
export async function listArticles(opts: { search?: string; orgId?: string } = {}) {
  const term = (opts.search || "").toLowerCase();
  const where = or(
    eq(knowledgeBaseArticles.isGlobal, true),
    opts.orgId ? eq(knowledgeBaseArticles.organizationId, opts.orgId) : undefined,
    term ? like(knowledgeBaseArticles.title, `%${term}%`) : undefined
  );
  return db.query.knowledgeBaseArticles.findMany({
    where: and(eq(knowledgeBaseArticles.published, true), where),
    orderBy: (t) => [desc(t.updatedAt)],
  });
}

export async function getArticle(slug: string) {
  const row = await db.query.knowledgeBaseArticles.findFirst({
    where: eq(knowledgeBaseArticles.slug, slug),
  });
  if (row) {
    await db.update(knowledgeBaseArticles).set({ views: sql`${knowledgeBaseArticles.views} + 1` }).where(eq(knowledgeBaseArticles.id, row.id));
  }
  return row;
}

export async function createArticle(ctx: any, input: {
  title: string;
  slug: string;
  category?: string;
  body: string;
  excerpt?: string;
  isGlobal?: boolean;
}) {
  const [row] = await db
    .insert(knowledgeBaseArticles)
    .values({
      organizationId: ctx.organizationId ?? null,
      authorId: ctx.userId ?? null,
      title: input.title,
      slug: input.slug,
      category: input.category ?? "general",
      body: input.body,
      excerpt: input.excerpt ?? null,
      isGlobal: input.isGlobal ?? true,
      published: true,
    })
    .returning();
  await logAuditSafe(ctx, {
    action: "kb_article.create",
    category: "organization",
    resourceType: "knowledge_base_article",
    resourceId: row.id,
    description: `Published KB article ${row.title}`,
  }).catch(() => undefined);
  return row;
}

// ── Announcements ───────────────────────────────────────────────────────────
export async function listAnnouncements(ctx: any) {
  const rows = await db.query.announcements.findMany({
    where: and(
      eq(announcements.organizationId, ctx.organizationId),
      eq(announcements.published, true)
    ),
    orderBy: (t) => [desc(t.createdAt)],
  });
  const now = Date.now();
  return rows.filter((a) => {
    if (a.startsAt && new Date(a.startsAt).getTime() > now) return false;
    if (a.endsAt && new Date(a.endsAt).getTime() < now) return false;
    return true;
  });
}

export async function createAnnouncement(ctx: any, input: {
  title: string;
  body: string;
  audience?: string;
  planFilter?: string;
  dismissible?: boolean;
}) {
  const [row] = await db
    .insert(announcements)
    .values({
      organizationId: ctx.organizationId,
      authorId: ctx.userId ?? null,
      title: input.title,
      body: input.body,
      audience: (input.audience as any) ?? "all",
      planFilter: input.planFilter ?? null,
      dismissible: input.dismissible ?? true,
      published: true,
    })
    .returning();
  await createNotification({
    organizationId: ctx.organizationId,
    category: "subscriptions",
    type: "announcement",
    title: row.title,
    message: row.body,
    deepLink: "/dashboard",
  }).catch(() => undefined);
  return row;
}
