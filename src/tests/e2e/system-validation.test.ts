/**
 * End-to-End System Validation (build-graph level)
 * ------------------------------------------------------------------
 * Validates the production-hardening wiring without requiring a running server
 * or a database: it asserts that the health/metrics endpoints, security
 * headers, instrumentation wiring, and cache/alerting modules exist and are
 * correctly connected. Complements scripts/validate-system.mjs (live probe).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("health & observability endpoints", () => {
  it("exposes liveness, readiness, full-health and metrics routes", () => {
    expect(read("src/app/api/health/live/route.ts")).toContain("alive");
    expect(read("src/app/api/health/ready/route.ts")).toContain("ready");
    expect(read("src/app/api/health/full/route.ts")).toContain("components");
    expect(read("src/app/api/metrics/route.ts")).toContain("kaziflow_requests_total");
  });

  it("metrics endpoint exports all core gauges", () => {
    const m = read("src/app/api/metrics/route.ts");
    for (const name of [
      "kaziflow_requests_total",
      "kaziflow_error_rate",
      "kaziflow_api_latency_p95_ms",
      "kaziflow_db_query_time_avg_ms",
      "kaziflow_alerts_critical",
    ]) {
      expect(m).toContain(name);
    }
  });
});

describe("security headers (next.config.ts)", () => {
  const cfg = read("next.config.ts");
  it("sends HSTS, CSP, nosniff and DENY framing", () => {
    expect(cfg).toContain("Strict-Transport-Security");
    expect(cfg).toContain("Content-Security-Policy");
    expect(cfg).toContain("X-Content-Type-Options");
    expect(cfg).toContain('"DENY"');
  });
  it("hides the powered-by header", () => {
    expect(cfg).toContain("poweredByHeader: false");
  });
  it("emits a standalone production build", () => {
    expect(cfg).toContain('output: "standalone"');
  });
});

describe("instrumentation wiring", () => {
  const ins = read("src/instrumentation.ts");
  it("registers global error handlers, error monitoring and env validation", () => {
    expect(ins).toContain("registerGlobalErrorHandlers");
    expect(ins).toContain("initErrorMonitoring");
    expect(ins).toContain("validateProductionEnv");
  });
});

describe("alerting thresholds", () => {
  const a = read("src/lib/monitoring/alerts.ts");
  it("defines SLO rules for error rate, p95 latency and DB latency", () => {
    expect(a).toContain("error-rate");
    expect(a).toContain("p95-latency");
    expect(a).toContain("db-latency");
    expect(a).toContain("0.005");
  });
});

describe("ci/cd & deployment artifacts", () => {
  it("has CI, deploy, security workflows, Dockerfile and compose", () => {
    expect(read(".github/workflows/ci.yml")).toContain("npm test");
    expect(read(".github/workflows/deploy.yml")).toContain("docker compose");
    expect(read("Dockerfile")).toContain("standalone");
    expect(read("docker-compose.yml")).toContain("redis:");
    expect(read("nginx.conf")).toContain("limit_req");
  });
});
