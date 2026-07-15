/**
 * KaziFlow — Prometheus metrics endpoint (Monitoring & Alerting)
 * ------------------------------------------------------------------
 * Exposes the in-process metrics collector in Prometheus text exposition
 * format, plus derived alert states so Alertmanager can scrape them. Scrape
 * target: GET /api/metrics (no auth — guard with network policy / sidecar).
 */
import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/metrics";
import { getAlertSummary } from "@/lib/monitoring/alerts";

export const dynamic = "force-dynamic";

function metric(
  name: string,
  type: "counter" | "gauge",
  help: string,
  value: number
): string {
  return `# TYPE ${name} ${type}\n# HELP ${name} ${help}\n${name} ${value}\n`;
}

export async function GET() {
  const s = getSnapshot();
  const summary = getAlertSummary();

  const lines = [
    metric(
      "kaziflow_requests_total",
      "counter",
      "Total API requests in the current window",
      s.requestCount
    ),
    metric(
      "kaziflow_errors_total",
      "counter",
      "Total API errors in the current window",
      s.errorCount
    ),
    metric(
      "kaziflow_error_rate",
      "gauge",
      "Error rate ratio in [0,1]",
      Number(s.errorRate.toFixed(4))
    ),
    metric(
      "kaziflow_api_latency_avg_ms",
      "gauge",
      "Average API latency in milliseconds",
      s.avgApiLatencyMs
    ),
    metric(
      "kaziflow_api_latency_p95_ms",
      "gauge",
      "p95 API latency in milliseconds",
      s.p95ApiLatencyMs
    ),
    metric(
      "kaziflow_db_query_time_avg_ms",
      "gauge",
      "Average DB query time in milliseconds",
      s.avgDbQueryTimeMs
    ),
    metric(
      "kaziflow_active_users",
      "gauge",
      "Currently active users",
      s.activeUsers
    ),
    metric(
      "kaziflow_uptime_seconds",
      "gauge",
      "Process uptime in seconds",
      s.uptimeSeconds
    ),
    metric(
      "kaziflow_alerts_critical",
      "gauge",
      "Number of firing critical alerts",
      summary.criticalCount
    ),
    metric(
      "kaziflow_alerts_warning",
      "gauge",
      "Number of firing warning alerts",
      summary.warningCount
    ),
  ];

  // Per-alert boolean gauges (1 = firing) for Alertmanager-friendly scraping.
  for (const a of summary.alerts) {
    lines.push(
      metric(
        `kaziflow_alert{id="${a.id}",severity="${a.severity}"}`,
        "gauge",
        a.name,
        a.firing ? 1 : 0
      )
    );
  }

  return new NextResponse(lines.join(""), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
