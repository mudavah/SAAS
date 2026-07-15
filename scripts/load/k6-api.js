// KaziFlow — API load test (Performance & Load Testing)
// ------------------------------------------------------------------------------
// k6 script: sustained read/write load against the public API + health probes.
// Run:  k6 run --env BASE_URL=https://api.kaziflow.co.ke scripts/load/k6-api.js
import http from "k6/http";
import { check, sleep, trend, rate } from "k6/metrics";
import { Rate } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "";

const errorRate = new Rate("app_errors");

export const options = {
  scenarios: {
    smoke: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "3m", target: 100 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000"], // p95 < 1s SLO
    app_errors: ["rate<0.01"], // <1% errors
  },
};

const headers = {
  "Content-Type": "application/json",
  Authorization: API_KEY ? `Bearer ${API_KEY}` : undefined,
};

export default function () {
  // Health probe (no auth).
  const health = http.get(`${BASE}/api/health/ready`);
  check(health, { "ready 200": (r) => r.status === 200 });

  // Authenticated read of invoices list (cached).
  const invoices = http.get(`${BASE}/api/v1/invoices`, { headers });
  const ok = check(invoices, {
    "invoices 200": (r) => r.status === 200,
  });
  if (!ok) errorRate.add(1);

  // Create + read a client (write path).
  const email = `load_${__VU}_${Date.now()}@example.com`;
  const create = http.post(
    `${BASE}/api/v1/clients`,
    JSON.stringify({ name: "Load Test", email }),
    { headers }
  );
  check(create, { "client created": (r) => r.status === 201 || r.status === 200 });

  sleep(1);
}
