// KaziFlow — invoice-heavy load test (Performance & Load Testing)
// ------------------------------------------------------------------------------
// Stresses the invoice CRUD + PDF path, the hottest workflow for the target
// Kenyan SMB segment. Validates the p95 < 1s SLO under concurrency.
// Run:  k6 run --env BASE_URL=https://app.kaziflow.co.ke scripts/load/k6-invoices.js
import http from "k6/http";
import { check, sleep } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "";
const headers = {
  "Content-Type": "application/json",
  Authorization: API_KEY ? `Bearer ${API_KEY}` : undefined,
};

export const options = {
  scenarios: {
    invoices: {
      executor: "constant-arrival-rate",
      rate: 50, // 50 invoices/min sustained
      timeUnit: "1m",
      duration: "5m",
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const invoice = {
    customerName: `Cust ${__VU}`,
    items: [{ description: "Consulting", quantity: 1, unitPrice: 5000 }],
    currency: "KES",
  };
  const res = http.post(`${BASE}/api/v1/invoices`, JSON.stringify(invoice), {
    headers,
  });
  check(res, { "invoice created": (r) => r.status === 201 || r.status === 200 });

  if (res.status === 201 || res.status === 200) {
    const id = (res.json("id") || "").toString();
    if (id) {
      http.get(`${BASE}/api/v1/invoices/${id}`, { headers });
      http.get(`${BASE}/api/v1/invoices/${id}/pdf`, { headers });
    }
  }
  sleep(0.5);
}
