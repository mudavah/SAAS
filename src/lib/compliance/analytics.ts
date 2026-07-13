/**
 * KaziFlow Compliance — analytics
 * ------------------------------------------------------------------
 * Aggregations over eTIMS submissions: success rate, failure breakdown,
 * average processing time, and monthly trend data. All queries are strictly
 * organization-scoped.
 */
import { db } from "@/db";
import { etimsInvoices } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";

export interface ComplianceAnalytics {
  totalSubmissions: number;
  validated: number;
  submitted: number;
  pending: number;
  failed: number;
  cancelled: number;
  successRate: number; // 0-100
  failureRate: number; // 0-100
  avgProcessingTimeMs: number;
  failureReasons: { reason: string; count: number }[];
  trend: {
    month: string; // YYYY-MM
    total: number;
    validated: number;
    failed: number;
    successRate: number;
  }[];
  simulatedCount: number;
  lastSubmissionAt: string | null;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function extractProcessingTime(response: unknown): number | null {
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (typeof r.processingTimeMs === "number") return r.processingTimeMs;
  }
  return null;
}

function extractFailureReason(record: {
  status: string;
  submissionResponse: unknown;
}): string | null {
  if (record.status !== "failed") return null;
  const resp = record.submissionResponse;
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    return (
      (r.errorMessage as string) ||
      (r.message as string) ||
      (r.resultMsg as string) ||
      (r.errorCode as string) ||
      "Unknown error"
    );
  }
  return "Unknown error";
}

/** Compute full compliance analytics for an organization. `months` controls the
 *  trend window (default 6). */
export async function getComplianceAnalytics(
  organizationId: string,
  months = 6
): Promise<ComplianceAnalytics> {
  const records = await db.query.etimsInvoices.findMany({
    where: eq(etimsInvoices.organizationId, organizationId),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });

  const total = records.length;
  const by = (s: string) => records.filter((r) => r.status === s).length;
  const validated = by("validated");
  const submitted = by("submitted");
  const pending = by("pending");
  const failed = by("failed");
  const cancelled = by("cancelled");

  const successful = validated + submitted;
  const decided = successful + failed;
  const successRate = decided > 0 ? Math.round((successful / decided) * 100) : 0;
  const failureRate = decided > 0 ? Math.round((failed / decided) * 100) : 0;

  // Average processing time from stored responses.
  const times: number[] = [];
  let simulatedCount = 0;
  const failureCounts = new Map<string, number>();

  for (const r of records) {
    const t = extractProcessingTime(r.submissionResponse);
    if (t != null) times.push(t);
    const resp = r.submissionResponse as Record<string, unknown> | null;
    if (resp && resp.simulated === true) simulatedCount++;
    const reason = extractFailureReason(r);
    if (reason) failureCounts.set(reason, (failureCounts.get(reason) ?? 0) + 1);
  }
  const avgProcessingTimeMs =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

  const failureReasons = Array.from(failureCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend.
  const trendMap = new Map<
    string,
    { total: number; validated: number; failed: number }
  >();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendMap.set(monthKey(d), { total: 0, validated: 0, failed: 0 });
  }
  for (const r of records) {
    const key = monthKey(new Date(r.createdAt));
    const bucket = trendMap.get(key);
    if (!bucket) continue;
    bucket.total++;
    if (r.status === "validated" || r.status === "submitted") bucket.validated++;
    if (r.status === "failed") bucket.failed++;
  }
  const trend = Array.from(trendMap.entries()).map(([month, v]) => {
    const dec = v.validated + v.failed;
    return {
      month,
      total: v.total,
      validated: v.validated,
      failed: v.failed,
      successRate: dec > 0 ? Math.round((v.validated / dec) * 100) : 0,
    };
  });

  return {
    totalSubmissions: total,
    validated,
    submitted,
    pending,
    failed,
    cancelled,
    successRate,
    failureRate,
    avgProcessingTimeMs,
    failureReasons,
    trend,
    simulatedCount,
    lastSubmissionAt: records[0]?.createdAt
      ? new Date(records[0].createdAt).toISOString()
      : null,
  };
}

/** Lightweight submission counts used by the health scorer and dashboard. */
export async function getSubmissionCounts(organizationId: string, sinceDays?: number) {
  const conditions = [eq(etimsInvoices.organizationId, organizationId)];
  if (sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    conditions.push(gte(etimsInvoices.createdAt, since));
  }
  const records = await db.query.etimsInvoices.findMany({
    where: and(...conditions),
    columns: { status: true },
  });
  const by = (s: string) => records.filter((r) => r.status === s).length;
  return {
    total: records.length,
    validated: by("validated"),
    submitted: by("submitted"),
    pending: by("pending"),
    failed: by("failed"),
    cancelled: by("cancelled"),
  };
}
