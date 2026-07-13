/**
 * KaziFlow Compliance — alerts
 * ------------------------------------------------------------------
 * Create, list, resolve and auto-generate compliance alerts. Alerts surface
 * failed submissions, upcoming/overdue deadlines, and configuration gaps.
 * Auto-generation is idempotent per rule so re-running does not duplicate
 * active alerts.
 */
import { db } from "@/db";
import {
  complianceAlerts,
  etimsConfig,
  taxCalendar,
  type ComplianceAlertSeverity,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSubmissionCounts } from "@/lib/compliance/analytics";
import { getUpcomingDeadlines } from "@/lib/compliance/calendar";
import { createNotification } from "@/lib/notifications";

export interface CreateAlertInput {
  organizationId: string;
  userId: string;
  severity?: ComplianceAlertSeverity;
  category: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
  /** When set, an existing active alert with the same dedupeKey (stored in
   *  metadata.dedupeKey) is not duplicated. */
  dedupeKey?: string;
  notify?: boolean;
}

/** Create an alert, optionally deduping and firing an in-app notification. */
export async function createComplianceAlert(
  input: CreateAlertInput
): Promise<typeof complianceAlerts.$inferSelect | null> {
  if (input.dedupeKey) {
    const existing = await db.query.complianceAlerts.findMany({
      where: and(
        eq(complianceAlerts.organizationId, input.organizationId),
        eq(complianceAlerts.resolved, false)
      ),
    });
    const dup = existing.find(
      (a) =>
        (a.metadata as Record<string, unknown> | null)?.dedupeKey ===
        input.dedupeKey
    );
    if (dup) return null;
  }

  const [alert] = await db
    .insert(complianceAlerts)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      severity: input.severity ?? "warning",
      category: input.category,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
      },
    })
    .returning();

  if (input.notify !== false) {
    await createNotification({
      organizationId: input.organizationId,
      category: "compliance",
      type: "compliance_alert",
      title: input.title,
      message: input.message,
      priority: input.severity === "critical" ? "urgent" : "normal",
      deepLink: input.actionUrl ?? "/dashboard/compliance/alerts",
    });
  }

  return alert;
}

export async function listComplianceAlerts(
  organizationId: string,
  opts: {
    resolved?: boolean;
    severity?: ComplianceAlertSeverity;
    unreadOnly?: boolean;
  } = {}
) {
  const conditions = [eq(complianceAlerts.organizationId, organizationId)];
  if (opts.resolved !== undefined)
    conditions.push(eq(complianceAlerts.resolved, opts.resolved));
  if (opts.severity)
    conditions.push(eq(complianceAlerts.severity, opts.severity));
  if (opts.unreadOnly) conditions.push(eq(complianceAlerts.read, false));

  return db.query.complianceAlerts.findMany({
    where: and(...conditions),
    orderBy: (a) => [desc(a.createdAt)],
  });
}

export async function markAlertRead(
  id: string,
  organizationId: string,
  read = true
) {
  const [updated] = await db
    .update(complianceAlerts)
    .set({ read })
    .where(
      and(
        eq(complianceAlerts.id, id),
        eq(complianceAlerts.organizationId, organizationId)
      )
    )
    .returning();
  return updated ?? null;
}

export async function resolveAlert(
  id: string,
  organizationId: string,
  resolved = true
) {
  const [updated] = await db
    .update(complianceAlerts)
    .set({
      resolved,
      read: true,
      resolvedAt: resolved ? new Date() : null,
    })
    .where(
      and(
        eq(complianceAlerts.id, id),
        eq(complianceAlerts.organizationId, organizationId)
      )
    )
    .returning();
  return updated ?? null;
}

export async function getActiveAlertCount(
  organizationId: string
): Promise<number> {
  const rows = await db.query.complianceAlerts.findMany({
    where: and(
      eq(complianceAlerts.organizationId, organizationId),
      eq(complianceAlerts.resolved, false)
    ),
    columns: { id: true },
  });
  return rows.length;
}

/**
 * Evaluate compliance rules and create alerts as needed. Idempotent via
 * dedupeKeys. Returns the alerts created in this run.
 */
export async function autoGenerateAlerts(
  organizationId: string,
  userId: string
): Promise<(typeof complianceAlerts.$inferSelect)[]> {
  const created: (typeof complianceAlerts.$inferSelect)[] = [];

  // Rule 1: eTIMS not configured / inactive.
  const config = await db.query.etimsConfig.findFirst({
    where: eq(etimsConfig.organizationId, organizationId),
  });
  if (!config || !config.isActive) {
    const a = await createComplianceAlert({
      organizationId,
      userId,
      severity: "warning",
      category: "configuration",
      title: "eTIMS is not active",
      message:
        "Your KRA eTIMS integration is not configured or is inactive. Invoices will not be submitted to KRA.",
      actionUrl: "/dashboard/compliance/config",
      dedupeKey: "etims_inactive",
    });
    if (a) created.push(a);
  }

  // Rule 2: failed submissions present.
  const counts = await getSubmissionCounts(organizationId);
  if (counts.failed > 0) {
    const a = await createComplianceAlert({
      organizationId,
      userId,
      severity: counts.failed >= 5 ? "critical" : "warning",
      category: "submission",
      title: `${counts.failed} failed eTIMS submission${counts.failed > 1 ? "s" : ""}`,
      message: `You have ${counts.failed} invoice submission${counts.failed > 1 ? "s" : ""} that failed and need attention. Retry them from the submissions queue.`,
      actionUrl: "/dashboard/compliance/submissions",
      dedupeKey: `failed_submissions_${counts.failed}`,
    });
    if (a) created.push(a);
  }

  // Rule 3: VAT deadline approaching (within 7 days) and not completed.
  const deadlines = getUpcomingDeadlines(new Date(), 2).filter(
    (d) => d.type === "vat"
  );
  const soon = deadlines.find(
    (d) => d.daysRemaining >= 0 && d.daysRemaining <= 7
  );
  if (soon) {
    // Only alert if the matching calendar row is not marked completed.
    const calRows = await db.query.taxCalendar.findMany({
      where: and(
        eq(taxCalendar.organizationId, organizationId),
        eq(taxCalendar.type, "vat")
      ),
    });
    const match = calRows.find((c) => c.title === soon.title);
    if (!match || !match.completed) {
      const a = await createComplianceAlert({
        organizationId,
        userId,
        severity: soon.daysRemaining <= 3 ? "critical" : "warning",
        category: "deadline",
        title: `VAT return due in ${soon.daysRemaining} day${soon.daysRemaining === 1 ? "" : "s"}`,
        message: `${soon.title} is due on ${soon.dueDate.toLocaleDateString("en-KE")}. File and pay to stay compliant.`,
        actionUrl: "/dashboard/compliance/calendar",
        dedupeKey: `vat_deadline_${soon.periodLabel}`,
      });
      if (a) created.push(a);
    }
  }

  return created;
}
