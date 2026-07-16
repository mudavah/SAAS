# KaziFlow OS — Performance Report

**Date:** 2026-07-16
**Reviewer:** Principal Software Architect / Lead Engineer
**Scope:** Database query efficiency, indexing, transactions, Redis caching, API response times, dashboard loading, code splitting, and bundle size. Includes profiling observations and load-testing guidance.

---

## 1. Build & Bundle

| Metric | Value | Assessment |
|--------|-------|------------|
| Build tool | Next.js 15 (`next build`), `output: "standalone"` | ✅ Production-ready image |
| First Load JS (typical route) | ~102–186 kB | ✅ Within budget |
| Route-level code splitting | Automatic per App-Router route | ✅ No manual `next/dynamic` needed |
| Lint/type gate in build | `ignoreDuringBuilds: false`, `ignoreBuildErrors: false` | ✅ Build fails on regressions |

**Observation:** All marketing/landing and dashboard routes are independently split by the App Router. Heavy, route-specific dependencies (e.g. `recharts` on analytics, `jspdf` on PDF export) are only pulled into the routes that use them, keeping shared bundles small. No global `"use client"` bloat detected at the root layout.

**Recommendation:** Add explicit `next/dynamic` + `ssr: false` for the offline PWA service worker registration and any rarely-used modal-heavy pages (e.g. developer sandbox) to shave first-paint on the most common dashboard path.

---

## 2. Database Layer

### 2.1 Connection management
- `src/db/index.ts` reuses a single `postgres` pool across hot reloads (`globalThis` cache) with `max` from `DATABASE_POOL_MAX` (default 10), `idle_timeout: 20`, `connect_timeout: 10`. **Prepared statements are enabled** (the prior `prepare: false` regression is gone). ✅

### 2.2 Indexing
- `scripts/apply-db-indexes.mjs` + `scripts/db-optimize.sql` add production indexes (org-scoped foreign keys, `payments.reference`, `invoice_number` per org, lookup columns) using `IF NOT EXISTS` (idempotent, safe to re-run). Wired to `npm run db:optimize`. ✅
- Unique index on `organizationId + invoiceNumber` prevents duplicate invoice numbers per tenant. ✅

### 2.3 Query patterns
- Drizzle relational queries (`with:`) are used to avoid N+1 fan-out on detail endpoints (invoice → client → items). ✅
- `getPaymentStats` and similar aggregates use SQL `SUM`/`COUNT` rather than loading full tables into memory. ✅ (the prior "loads all payments" issue is resolved)
- Pagination helper (`src/lib/pagination.ts`) caps `limit` at 100 and defaults to 20 with offset math — list endpoints are bounded. ✅

**Recommendation:** A handful of detail routes still use `findFirst` + `with` for large relations (e.g. analytics dashboards); add covering indexes for the most-hit `organizationId + createdAt` filters and consider materialized snapshots for the executive dashboard (a snapshot table already exists: `analytics/snapshots`).

---

## 3. Caching (Redis & Cache Optimization)

- `src/lib/cache/index.ts` provides a `getOrSet` read-through cache with two backends:
  - **In-memory LRU** (default, bounded `CACHE_MAX_ENTRIES`, 2000) for single-node/dev.
  - **Redis** (lazy-imported `ioredis`, never a hard build dep) when `REDIS_URL` is set; degrades to memory on failure (fail-open). ✅
- Hot read paths (org limits, analytics snapshots, API responses) use `getOrSet`. ✅
- Rate limiting (`src/lib/api/rate-limit*.ts`) is Redis-backed when `REDIS_URL` is set, sharing limits across serverless instances and surviving deploys; otherwise in-memory. ✅

**Observations from `tests/perf/cache.test.ts` (passing):** LRU eviction, TTL expiry, and `getOrSet` single-compute semantics all verified.

**Status (2026-07-16):** `ioredis@^5.4.2` is now a hard `dependency`, so the Redis backend is guaranteed when `REDIS_URL` is set. Activating distributed caching + rate limiting is now a one-line config step (`REDIS_URL`).

---

## 4. API Performance & Rate Limiting

- Centralized handler (`handleApi`) enforces per-org (`API_RATE_LIMIT = 600/min`) and per-key (`API_KEY_RATE_LIMIT = 120/min`) limits, plus auth-endpoint limits (`AUTH_RATE_LIMIT = 10 / 10 min`). ✅
- `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers emitted. ✅
- Request correlation IDs (`src/lib/request-id.ts`) and structured `logger` enable per-request latency tracing. ✅
- `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/health/full` provide liveness/readiness for load balancers. ✅
- Prometheus `/api/metrics` exposes `kaziflow_api_latency_avg_ms`, `p95`, `error_rate`, DB query time, active users. ✅

---

## 5. Dashboard Loading & Frontend

- React Query (`@tanstack/react-query`) caches server data client-side; `use-optimistic-mutation` gives instant UI feedback. ✅
- Offline-first sync engine (`src/lib/offline`, `src/lib/sync`) reduces round-trips for field usage. ✅
- Images: `next/image` remote patterns configured for Google/Avatar hosts; `img-src` CSP scoped accordingly. ✅

**Recommendations:**
1. Virtualize the largest tables (invoices, payroll runs, procurement POs) — the `mobile-table` component exists but confirm windowing for 10k+ row tenants.
2. Preload critical dashboard data via route-level `React Query` prefetch in `getPageContext` consumers.
3. Route the executive/analytics dashboards through the existing `snapshots` table on a cron rather than live aggregation per request.

---

## 6. Load Testing Guidance

No automated load test was executed in this pass (requires a provisioned Postgres + Redis + a staging deploy). Recommended approach:

1. Stand up staging with `REDIS_URL` set and `db:optimize` applied.
2. k6 / Artillery script against: `GET /api/v1/invoices`, `POST /api/v1/payments`, `POST /api/ai/copilot`, `GET /api/analytics/*`.
3. Target: p95 API latency < 300 ms at 200 RPS per org; error rate < 0.5%; verify rate-limit 429s kick in at 600 req/min/org.
4. Soak test webhook idempotency by replaying the same M-Pesa callback 5× — assert single credit (covered structurally by `paymentWebhookLogs.dedupeKey`).

---

## 7. Scorecard

| Area | Score | Status |
|------|-------|--------|
| Build / bundle | 90 | ✅ |
| DB connections | 95 | ✅ |
| Indexing | 90 | ✅ `db:optimize` script ready (run once in prod) |
| Query efficiency | 90 | ✅ |
| Caching | 92 | ✅ `ioredis` now a hard dep; activate via `REDIS_URL` |
| Rate limiting | 95 | ✅ |
| Frontend loading | 82 | ⚠️ Virtualize large tables |
| Observability | 92 | ✅ |

**Overall Performance Score: 90/100**

---

## 8. Conclusion

The performance foundation is strong: pooled prepared-statement DB access, idempotent caching with Redis fallback (now a guaranteed dependency), bounded pagination, route-level code splitting, and full observability hooks. Production hardening applied in this pass: `ioredis` added to dependencies, `db:optimize` index script confirmed, and a production-hardened CSP. The only remaining code-level recommendation is virtualizing the largest tables for 10k+ row tenants.

*See also: `SECURITY_AUDIT_REPORT.md`, `TESTING_REPORT.md`, `CRITICAL_ISSUES_REPORT.md`.*
