/**
 * KaziFlow — Business Timeline
 * ------------------------------------------------------------------
 * A centralized, read-only, append-only aggregation of business events from
 * every module (invoices, payments, inventory, compliance, ...). Every
 * event is organization-scoped and immutable — never update or delete rows.
 *
 * `emitTimelineEvent` is intentionally best-effort: it wraps all work in a
 * try/catch and never throws, so a timeline failure can never block or roll
 * back the main business operation that produced the event.
 */
import { db } from "@/db";
import { businessTimeline, type TimelineEventType } from "@/db/schema";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

export interface EmitTimelineEventInput {
  /** Actor who triggered the event. Null/undefined for system events. */
  userId?: string | null;
  organizationId: string;
  eventType: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  resourceType?: string | null;
  resourceId?: string | null;
}

/**
 * Append a single event to the business timeline. Always resolves — errors are
 * caught and logged so callers can fire-and-forget without try/catch of their
 * own (though wrapping the call in try/catch at the call site is still fine and
 * recommended for defense in depth).
 */
export async function emitTimelineEvent(
  opts: EmitTimelineEventInput
): Promise<void> {
  try {
    if (!opts.organizationId || !opts.eventType || !opts.title) {
      // Never throw — just skip malformed events.
      return;
    }

    await db.insert(businessTimeline).values({
      organizationId: opts.organizationId,
      userId: opts.userId ?? null,
      eventType: opts.eventType,
      title: opts.title,
      description: opts.description ?? null,
      resourceType: opts.resourceType ?? null,
      resourceId: opts.resourceId ?? null,
      metadata: opts.metadata ?? null,
    } as any);
  } catch (err) {
    // Best-effort: timeline must never break the main flow.
    console.error("emitTimelineEvent failed:", err);
  }
}

export interface ListTimelineOptions {
  page?: number;
  limit?: number;
  eventType?: string | null;
  resourceType?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  search?: string | null;
}

export interface ListTimelineResult {
  data: (typeof businessTimeline.$inferSelect & {
    user?: { id: string; name: string | null; email: string | null } | null;
  })[];
  nextCursor: number | null;
  total: number;
}

/** Paginated, filterable read of the timeline for one organization. */
export async function listTimelineEvents(
  organizationId: string,
  opts: ListTimelineOptions = {}
): Promise<ListTimelineResult> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(Math.max(1, opts.limit ?? 20), 100);
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [eq(businessTimeline.organizationId, organizationId)];

  if (opts.eventType) {
    conditions.push(
      eq(businessTimeline.eventType, opts.eventType as TimelineEventType)
    );
  }
  if (opts.resourceType) {
    conditions.push(eq(businessTimeline.resourceType, opts.resourceType));
  }
  if (opts.startDate) {
    conditions.push(gte(businessTimeline.createdAt, opts.startDate));
  }
  if (opts.endDate) {
    conditions.push(lte(businessTimeline.createdAt, opts.endDate));
  }
  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      sql`(${businessTimeline.title} ILIKE ${term} OR ${businessTimeline.description} ILIKE ${term})`
    );
  }

  const where = and(...conditions);

  const [rowsRaw, totalResult] = await Promise.all([
    db.query.businessTimeline.findMany({
      where,
      orderBy: [desc(businessTimeline.createdAt)],
      limit,
      offset,
      with: {
        user: { columns: { id: true, name: true, email: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(businessTimeline)
      .where(where),
  ]);
  const rows = rowsRaw as any[];

  const total = Number(totalResult[0]?.count ?? 0);
  const nextCursor = offset + rows.length < total ? page + 1 : null;

  return { data: rows, nextCursor, total };
}

export interface TimelineStat {
  eventType: string;
  count: number;
}

export interface TimelineStatsResult {
  since: string;
  total: number;
  byEventType: TimelineStat[];
}

/** Activity statistics grouped by event type for the trailing N days (default 30). */
export async function getTimelineStats(
  organizationId: string,
  days = 30
): Promise<TimelineStatsResult> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      eventType: businessTimeline.eventType,
      count: sql<number>`count(*)`,
    })
    .from(businessTimeline)
    .where(
      and(
        eq(businessTimeline.organizationId, organizationId),
        gte(businessTimeline.createdAt, since)
      )
    )
    .groupBy(businessTimeline.eventType)
    .orderBy(desc(sql`count(*)`));

  const byEventType: TimelineStat[] = rows.map((r) => ({
    eventType: r.eventType,
    count: Number(r.count),
  }));
  const total = byEventType.reduce((sum, r) => sum + r.count, 0);

  return { since: since.toISOString(), total, byEventType };
}
