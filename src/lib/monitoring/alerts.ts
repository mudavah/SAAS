/**
 * KaziFlow — alerting (Monitoring & Alerting)
 * ------------------------------------------------------------------
 * Pure evaluation of observability signals against production SLO thresholds.
 * Consumed both by the `/api/metrics` endpoint (which exposes the alert state
 * for Prometheus Alertmanager) and by the Launch Readiness dashboard.
 *
 * The functions here are side-effect free: raising an alert (email / webhook /
 * pager) is the responsibility of the deployed Alertmanager / incident tool,
 * driven by the metrics endpoint. This module only *computes* alert states.
 */
import { getSnapshot, type MetricsSnapshot } from "@/lib/metrics";

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: "critical" | "warning" | "info";
  /** Returns true when the condition is BREACHED (alerting). */
  evaluate: (m: MetricsSnapshot) => boolean;
  /** Human-readable reason when breached (or "" when healthy). */
  reason: (m: MetricsSnapshot) => string;
}

export interface AlertState {
  id: string;
  name: string;
  severity: AlertRule["severity"];
  firing: boolean;
  reason: string;
}

// SLO thresholds for v1.0 production. Tuned for a mobile-first SaaS where the
// p95 API budget is ~1s and error budget is ~0.5%.
export const ALERT_RULES: AlertRule[] = [
  {
    id: "error-rate",
    name: "API error rate",
    description: "Error rate exceeds 0.5% over the sampling window.",
    severity: "critical",
    evaluate: (m) => m.requestCount > 0 && m.errorRate > 0.005,
    reason: (m) =>
      m.errorRate > 0.005
        ? `Error rate ${(m.errorRate * 100).toFixed(2)}% exceeds 0.5% budget`
        : "",
  },
  {
    id: "p95-latency",
    name: "API p95 latency",
    description: "p95 API latency exceeds 1000ms.",
    severity: "warning",
    evaluate: (m) => m.p95ApiLatencyMs > 1000,
    reason: (m) =>
      m.p95ApiLatencyMs > 1000
        ? `p95 latency ${m.p95ApiLatencyMs}ms exceeds 1000ms budget`
        : "",
  },
  {
    id: "db-latency",
    name: "Database query latency",
    description: "Average DB query time exceeds 200ms.",
    severity: "warning",
    evaluate: (m) => m.avgDbQueryTimeMs > 200,
    reason: (m) =>
      m.avgDbQueryTimeMs > 200
        ? `avg DB query ${m.avgDbQueryTimeMs}ms exceeds 200ms`
        : "",
  },
  {
    id: "no-traffic",
    name: "No recent traffic",
    description: "No requests observed in the last window (possible outage).",
    severity: "info",
    evaluate: (m) => m.requestCount === 0,
    reason: (m) => (m.requestCount === 0 ? "Zero requests in sampling window" : ""),
  },
];

/** Evaluate every rule against the current metrics snapshot. */
export function evaluateAlerts(snapshot: MetricsSnapshot = getSnapshot()): AlertState[] {
  return ALERT_RULES.map((rule) => {
    const firing = rule.evaluate(snapshot);
    return {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      firing,
      reason: firing ? rule.reason(snapshot) : "",
    };
  });
}

export interface AlertSummary {
  healthy: boolean;
  criticalCount: number;
  warningCount: number;
  alerts: AlertState[];
  snapshot: MetricsSnapshot;
}

export function getAlertSummary(): AlertSummary {
  const snapshot = getSnapshot();
  const alerts = evaluateAlerts(snapshot);
  const critical = alerts.filter((a) => a.firing && a.severity === "critical");
  const warning = alerts.filter((a) => a.firing && a.severity === "warning");
  return {
    healthy: critical.length === 0,
    criticalCount: critical.length,
    warningCount: warning.length,
    alerts,
    snapshot,
  };
}
