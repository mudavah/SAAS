/**
 * KaziFlow — full system health (Health Checks)
 * ------------------------------------------------------------------
 * Comprehensive readiness probe used by the Launch Readiness dashboard and
 * orchestrators. Reports each subsystem (database, cache, alert state) with a
 * roll-up status. Unlike /api/health/ready (hard dependency gate) this never
 * returns 503 for non-critical subsystems — it surfaces their state so the
 * dashboard can show degraded-but-operational status.
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { cache, isDistributedCache, redisAvailable } from "@/lib/cache";
import { getAlertSummary } from "@/lib/monitoring/alerts";
import { getSnapshot } from "@/lib/metrics";

export const dynamic = "force-dynamic";

interface Component {
  name: string;
  status: "ok" | "degraded" | "down";
  detail: string;
  latencyMs?: number;
}

export async function GET() {
  const components: Component[] = [];
  let criticalDown = false;

  // Database
  try {
    const start = Date.now();
    await db.execute(sql`select 1`);
    components.push({
      name: "database",
      status: "ok",
      detail: "PostgreSQL reachable",
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    components.push({
      name: "database",
      status: "down",
      detail: err instanceof Error ? err.message : "unreachable",
    });
    criticalDown = true;
  }

  // Cache layer (Redis when configured, else in-memory)
  try {
    const start = Date.now();
    const probeKey = "__kf_health_probe__";
    await cache.set(probeKey, 1, 5);
    const ok = (await cache.get(probeKey)) === 1;
    components.push({
      name: redisAvailable() ? "cache:redis" : "cache:memory",
      status: ok ? "ok" : "degraded",
      detail: isDistributedCache()
        ? "Redis reachable"
        : "In-memory cache active (set REDIS_URL for shared cache)",
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    components.push({
      name: redisAvailable() ? "cache:redis" : "cache:memory",
      status: "degraded",
      detail: err instanceof Error ? err.message : "cache error",
    });
  }

  // Alerting / SLO state
  const summary = getAlertSummary();
  components.push({
    name: "alerting",
    status: summary.healthy ? "ok" : "degraded",
    detail: summary.healthy
      ? "All SLOs within budget"
      : `${summary.criticalCount} critical, ${summary.warningCount} warning alerts firing`,
  });

  const overall: "healthy" | "degraded" | "down" = criticalDown
    ? "down"
    : components.some((c) => c.status === "degraded")
      ? "degraded"
      : "healthy";

  const body = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptimeSeconds: getSnapshot().uptimeSeconds,
    components,
    alerts: summary.alerts,
  };

  const status = overall === "down" ? 503 : 200;
  return NextResponse.json(body, { status });
}
