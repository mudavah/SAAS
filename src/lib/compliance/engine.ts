/**
 * KaziFlow Compliance — engine
 * ------------------------------------------------------------------
 * Orchestrates eTIMS submissions (with retry), and computes the compliance
 * health score. Integrates with the eTIMS helpers in `@/lib/mpesa`, audit
 * logging, notifications, and the alerts subsystem. Every operation is strictly
 * organization-scoped via the caller's ServerContext.
 */
import { db } from "@/db";
import {
  etimsConfig,
  etimsInvoices,
  etimsComplianceLogs,
  invoices,
  type ComplianceHealthScore,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { decryptConfigSecrets } from "@/lib/crypto";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import {
  submitInvoiceToEtims,
  EtimsError,
  type EtimsConfigLike,
  type EtimsSubmissionPayload,
} from "@/lib/mpesa";
import { createComplianceAlert } from "@/lib/compliance/alerts";
import { getSubmissionCounts } from "@/lib/compliance/analytics";
import { getActiveAlertCount } from "@/lib/compliance/alerts";

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) || 0 : v;
}

// ── Health scoring ──────────────────────────────────────────────────────────

export interface HealthScoreInput {
  counts: {
    total: number;
    validated: number;
    submitted: number;
    pending: number;
    failed: number;
    cancelled: number;
  };
  activeAlerts: number;
  isConfigured: boolean;
}

export interface HealthScoreResult {
  score: ComplianceHealthScore;
  numericScore: number; // 0-100
  successRate: number; // 0-100
  label: string;
  summary: string;
  factors: { label: string; impact: number; detail: string }[];
}

const SCORE_LABELS: Record<ComplianceHealthScore, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

function bandFromNumeric(n: number): ComplianceHealthScore {
  if (n >= 90) return "excellent";
  if (n >= 75) return "good";
  if (n >= 55) return "fair";
  return "poor";
}

/** Pure health-score computation from submission counts and alert pressure. */
export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const { counts, activeAlerts, isConfigured } = input;
  const successful = counts.validated + counts.submitted;
  const decided = successful + counts.failed;
  const successRate = decided > 0 ? Math.round((successful / decided) * 100) : 0;

  const factors: { label: string; impact: number; detail: string }[] = [];
  let numeric = 100;

  if (!isConfigured) {
    numeric -= 35;
    factors.push({
      label: "eTIMS inactive",
      impact: -35,
      detail: "eTIMS integration is not active; invoices are not submitted to KRA.",
    });
  }

  if (decided > 0) {
    const rateImpact = -Math.round((100 - successRate) * 0.6);
    if (rateImpact !== 0) {
      numeric += rateImpact;
      factors.push({
        label: "Submission success rate",
        impact: rateImpact,
        detail: `${successRate}% of decided submissions validated.`,
      });
    }
  } else if (isConfigured) {
    // Configured but no submissions yet — mild neutral penalty.
    numeric -= 10;
    factors.push({
      label: "No submissions yet",
      impact: -10,
      detail: "No invoices have been submitted to eTIMS yet.",
    });
  }

  if (counts.failed > 0) {
    const failImpact = -Math.min(30, counts.failed * 5);
    numeric += failImpact;
    factors.push({
      label: "Failed submissions",
      impact: failImpact,
      detail: `${counts.failed} submission(s) currently failed.`,
    });
  }

  if (counts.pending > 0) {
    const pendImpact = -Math.min(15, counts.pending * 2);
    numeric += pendImpact;
    factors.push({
      label: "Pending backlog",
      impact: pendImpact,
      detail: `${counts.pending} submission(s) awaiting processing.`,
    });
  }

  if (activeAlerts > 0) {
    const alertImpact = -Math.min(20, activeAlerts * 4);
    numeric += alertImpact;
    factors.push({
      label: "Active alerts",
      impact: alertImpact,
      detail: `${activeAlerts} unresolved compliance alert(s).`,
    });
  }

  numeric = Math.max(0, Math.min(100, numeric));
  const score = bandFromNumeric(numeric);

  const summary =
    score === "excellent"
      ? "Your tax compliance is in excellent shape."
      : score === "good"
      ? "Your compliance is healthy with minor items to watch."
      : score === "fair"
      ? "Some compliance issues need your attention."
      : "Your compliance needs urgent attention.";

  return {
    score,
    numericScore: numeric,
    successRate,
    label: SCORE_LABELS[score],
    summary,
    factors,
  };
}

/** Load counts + alerts + config and compute the org's compliance health. */
export async function getComplianceHealth(
  organizationId: string
): Promise<HealthScoreResult & { counts: HealthScoreInput["counts"]; activeAlerts: number; isConfigured: boolean }> {
  const [counts, activeAlerts, config] = await Promise.all([
    getSubmissionCounts(organizationId),
    getActiveAlertCount(organizationId),
    db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.organizationId, organizationId),
    }),
  ]);

  const isConfigured = !!config && config.isActive;
  const result = computeHealthScore({ counts, activeAlerts, isConfigured });
  return { ...result, counts, activeAlerts, isConfigured };
}

// ── Submission orchestration ────────────────────────────────────────────────

export interface SubmitOptions {
  /** Reuse an existing etimsInvoices row (retry) instead of creating a new one. */
  existingRecordId?: string;
  attempt?: number;
}

export interface SubmitResult {
  ok: boolean;
  record: typeof etimsInvoices.$inferSelect | null;
  error?: string;
}

async function loadConfig(organizationId: string): Promise<EtimsConfigLike | null> {
  const config = await db.query.etimsConfig.findFirst({
    where: eq(etimsConfig.organizationId, organizationId),
  });
  if (!config) return null;
  const decrypted = decryptConfigSecrets(config)!;
  return {
    tin: decrypted.tin,
    pin: decrypted.pin,
    deviceId: decrypted.deviceId,
    apiKey: decrypted.apiKey,
    environment: decrypted.environment,
    isActive: decrypted.isActive,
  };
}

function buildPayload(invoice: {
  invoiceNumber: string;
  issueDate: Date;
  currency: string;
  subtotal: string | number;
  taxAmount: string | number | null;
  total: string | number;
  taxRate: string | number | null;
  client?: { name: string } | null;
  items?: { description: string; quantity: string | number; unitPrice: string | number; amount: string | number }[];
}): EtimsSubmissionPayload {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    currency: invoice.currency,
    subtotal: num(invoice.subtotal),
    taxAmount: num(invoice.taxAmount),
    total: num(invoice.total),
    customerName: invoice.client?.name ?? null,
    items: (invoice.items ?? []).map((it) => ({
      description: it.description,
      quantity: num(it.quantity),
      unitPrice: num(it.unitPrice),
      amount: num(it.amount),
      taxRate: num(invoice.taxRate),
    })),
  };
}

/**
 * Submit a single invoice to eTIMS with full side effects: persist an
 * etimsInvoices record, write a compliance log, fire notifications, and raise
 * an alert on failure. Safe to call for both first attempts and retries.
 */
export async function submitInvoice(
  ctx: ServerContext,
  invoiceId: string,
  options: SubmitOptions = {}
): Promise<SubmitResult> {
  const organizationId = ctx.organizationId;
  const userId = ctx.userId!;

  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    with: { client: true, items: true },
  });
  if (!invoice) {
    return { ok: false, record: null, error: "Invoice not found." };
  }

  const config = await loadConfig(organizationId);

  const attempt = options.attempt ?? 1;

  try {
    if (!config || !config.isActive) {
      throw new EtimsError(
        "CONFIG_MISSING",
        "eTIMS is not configured or active."
      );
    }

    const payload = buildPayload(invoice as any);
    const result = await submitInvoiceToEtims(config, payload);

    const responsePayload = {
      ...result.raw,
      message: result.message,
      simulated: result.simulated,
      processingTimeMs: result.processingTimeMs,
      controlUnitInvoiceNumber: result.controlUnitInvoiceNumber,
      qrCodeUrl: result.qrCodeUrl,
      attempt,
    };

    let record: typeof etimsInvoices.$inferSelect;
    if (options.existingRecordId) {
      const [updated] = await db
        .update(etimsInvoices)
        .set({
          status: result.status,
          etimsInvoiceNumber: result.etimsInvoiceNumber,
          submissionResponse: responsePayload,
          submittedAt: new Date(),
        })
        .where(
          and(
            eq(etimsInvoices.id, options.existingRecordId),
            eq(etimsInvoices.organizationId, organizationId)
          )
        )
        .returning();
      record = updated;
    } else {
      const [created] = await db
        .insert(etimsInvoices)
        .values({
          organizationId,
          userId,
          invoiceId: invoice.id,
          etimsInvoiceNumber: result.etimsInvoiceNumber,
          status: result.status,
          submissionResponse: responsePayload,
          submittedAt: new Date(),
        })
        .returning();
      record = created;
    }

    await db.insert(etimsComplianceLogs).values({
      organizationId,
      userId,
      action: options.existingRecordId ? "etims.retry.success" : "etims.submit.success",
      details: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        etimsInvoiceNumber: result.etimsInvoiceNumber,
        attempt,
        simulated: result.simulated,
      },
    });

    await logAuditSafe(ctx, {
      action: options.existingRecordId ? "etims_invoice.retry" : "etims_invoice.submit",
      category: "compliance",
      resourceType: "etims_invoice",
      resourceId: record.id,
      description: `Submitted invoice ${invoice.invoiceNumber} to KRA eTIMS`,
      newValues: { etimsInvoiceNumber: result.etimsInvoiceNumber, status: result.status },
    });

    await createNotification({
      organizationId,
      category: "compliance",
      type: "etims_submitted",
      title: "eTIMS submission validated",
      message: `Invoice ${invoice.invoiceNumber} was validated by KRA eTIMS.`,
      deepLink: "/dashboard/compliance",
    });

    return { ok: true, record };
  } catch (err) {
    const isEtims = err instanceof EtimsError;
    const errorCode = isEtims ? (err as EtimsError).code : "UNKNOWN";
    const errorMessage = isEtims
      ? (err as EtimsError).userMessage
      : err instanceof Error
      ? err.message
      : "Unknown error";

    const responsePayload = {
      errorCode,
      errorMessage,
      message: errorMessage,
      simulated: false,
      attempt,
      failedAt: new Date().toISOString(),
    };

    let record: typeof etimsInvoices.$inferSelect | null = null;
    if (options.existingRecordId) {
      const [updated] = await db
        .update(etimsInvoices)
        .set({ status: "failed", submissionResponse: responsePayload })
        .where(
          and(
            eq(etimsInvoices.id, options.existingRecordId),
            eq(etimsInvoices.organizationId, organizationId)
          )
        )
        .returning();
      record = updated ?? null;
    } else {
      const [created] = await db
        .insert(etimsInvoices)
        .values({
          organizationId,
          userId,
          invoiceId: invoice.id,
          status: "failed",
          submissionResponse: responsePayload,
        })
        .returning();
      record = created;
    }

    await db.insert(etimsComplianceLogs).values({
      organizationId,
      userId,
      action: "etims.submit.failed",
      details: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        errorCode,
        errorMessage,
        attempt,
      },
    });

    await createComplianceAlert({
      organizationId,
      userId,
      severity: "critical",
      category: "submission",
      title: `eTIMS submission failed: ${invoice.invoiceNumber}`,
      message: `${errorMessage} Retry from the submissions queue.`,
      actionUrl: "/dashboard/compliance/submissions",
      metadata: { invoiceId: invoice.id, errorCode },
      dedupeKey: `submit_failed_${invoice.id}`,
    });

    return { ok: false, record, error: errorMessage };
  }
}

/** Retry a set of failed submissions. Returns per-record outcomes. */
export async function retryFailedSubmissions(
  ctx: ServerContext,
  recordIds?: string[]
): Promise<{ id: string; ok: boolean; error?: string }[]> {
  const organizationId = ctx.organizationId;

  const failed = await db.query.etimsInvoices.findMany({
    where: and(
      eq(etimsInvoices.organizationId, organizationId),
      eq(etimsInvoices.status, "failed")
    ),
  });

  const targets = recordIds
    ? failed.filter((r) => recordIds.includes(r.id))
    : failed;

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const rec of targets) {
    const prevAttempt =
      Number((rec.submissionResponse as Record<string, unknown> | null)?.attempt ?? 1) || 1;
    const res = await submitInvoice(ctx, rec.invoiceId, {
      existingRecordId: rec.id,
      attempt: prevAttempt + 1,
    });
    results.push({ id: rec.id, ok: res.ok, error: res.error });
  }
  return results;
}
