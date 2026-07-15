#!/usr/bin/env node
// KaziFlow — end-to-end system validation (End-to-End System Validation)
// ------------------------------------------------------------------------------
// Lightweight pre-deploy smoke check that hits the running app's health and
// metrics endpoints and verifies environment completeness. Exits non-zero on
// any blocking failure. Safe to run in CI after a deploy (or locally).
//
//   BASE_URL=https://app.kaziflow.co.ke node scripts/validate-system.mjs

const REQUIRED_ENV = ["DATABASE_URL", "AUTH_SECRET", "AUTH_URL", "NEXT_PUBLIC_APP_URL", "APP_ENCRYPTION_KEY"];
const RECOMMENDED_ENV = ["REDIS_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "OPENAI_API_KEY", "RESEND_API_KEY"];

const BASE = process.env.BASE_URL || "http://localhost:3000";
const fails = [];
const warns = [];

async function check(name, fn) {
  try {
    const r = await fn();
    if (r.ok) console.log(`  PASS  ${name}`);
    else {
      console.log(`  FAIL  ${name}: ${r.reason}`);
      fails.push(name);
    }
  } catch (e) {
    console.log(`  FAIL  ${name}: ${e.message}`);
    fails.push(name);
  }
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, json: await res.json().catch(() => null) };
}

console.log(`KaziFlow system validation @ ${BASE}\n`);

await check("liveness probe", async () => {
  const r = await fetch(`${BASE}/api/health/live`);
  return { ok: r.status === 200, reason: `status ${r.status}` };
});

await check("readiness probe (db)", async () => {
  const r = await getJson("/api/health/ready");
  if (r.status !== 200) return { ok: false, reason: `status ${r.status}` };
  if (r.json?.database !== "connected")
    return { ok: false, reason: `db ${r.json?.database}` };
  return { ok: true };
});

await check("full health components", async () => {
  const r = await getJson("/api/health/full");
  if (r.status !== 200) return { ok: false, reason: `status ${r.status}` };
  const down = (r.json?.components || []).filter((c) => c.status === "down");
  if (down.length) return { ok: false, reason: `down: ${down.map((d) => d.name)}` };
  return { ok: true };
});

await check("metrics endpoint", async () => {
  const res = await fetch(`${BASE}/api/metrics`);
  const text = await res.text();
  return {
    ok: res.status === 200 && text.includes("kaziflow_requests_total"),
    reason: res.status === 200 ? "" : `status ${res.status}`,
  };
});

await check("security headers", async () => {
  const res = await fetch(`${BASE}/`, { redirect: "manual" });
  const h = res.headers;
  const required = [
    "strict-transport-security",
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
  ];
  const missing = required.filter((k) => !h.get(k));
  if (missing.length) return { ok: false, reason: `missing ${missing}` };
  return { ok: true };
});

await check("environment validation", async () => {
  const missingRequired = REQUIRED_ENV.filter((k) => !process.env[k]);
  const missingRecommended = RECOMMENDED_ENV.filter((k) => !process.env[k]);
  if (missingRequired.length)
    return { ok: false, reason: `missing ${missingRequired.join(", ")}` };
  if (missingRecommended.length)
    warns.push(`recommended env missing: ${missingRecommended.join(", ")}`);
  return { ok: true };
});

console.log("");
if (warns.length) warns.forEach((w) => console.log(`  WARN  ${w}`));
if (fails.length) {
  console.log(`\nVALIDATION FAILED (${fails.length} blocking): ${fails.join(", ")}`);
  process.exit(1);
}
console.log("VALIDATION PASSED");
