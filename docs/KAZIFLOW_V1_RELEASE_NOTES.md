# KaziFlow v1.0 — Release Notes

**Release date:** 2026-07-15  ·  **Type:** Major (commercial launch)  ·  **Epic:** 12 — Launch Readiness & Production Hardening

KaziFlow v1.0 is the first commercial release of the multi-tenant business-management platform for Kenyan and African SMBs. This release hardens the system for production and adds the full launch-operations surface (monitoring, CI/CD, Docker, backups) on top of the existing 15+ business modules.

---

## Highlights

### Reliability & Operations
- **Health endpoints:** liveness (`/api/health/live`), readiness (`/api/health/ready`, DB gate), and full component health (`/api/health/full`).
- **Observability:** Prometheus `/api/metrics` endpoint, in-process metrics collector (latency, error rate, DB time, active users), and declarative SLO alert rules.
- **Alerting:** SLO thresholds for error rate (0.5%), p95 latency (1s), DB latency (200ms) wired for Alertmanager.
- **CI/CD:** GitHub Actions CI (lint/typecheck/test/build) + deploy workflow (Docker build & push to GHCR, SSH rolling deploy) + weekly security scan (npm audit, CodeQL, Trufflehog).
- **Docker:** multi-stage `Dockerfile` (standalone output, non-root), `docker-compose` (app + Postgres + Redis + nginx), nginx reverse proxy (TLS, gzip, HTTP/2, rate limiting).
- **Backups & DR:** automated `pg_dump` backups with integrity verification, retention pruning, optional object-store sync, and a restore playbook.

### Performance
- **Caching:** unified `src/lib/cache` (in-memory LRU default; optional Redis via `REDIS_URL`), read-through `getOrSet`, and `withReadCache` (ETag/304 + `stale-while-revalidate`).
- **Distributed rate limiting:** Redis-backed limiter shared across instances (per-org 600/min, per-key 120/min), fail-open.
- **Database:** composite/join-accelerator index plan (`scripts/db-optimize.sql`) for the dominant multi-tenant query shapes.

### Security
- Hardened security headers (HSTS preload, CSP, nosniff, frame-deny, COOP, Permissions-Policy) at Next.js + nginx.
- Non-fatal production env validation at boot (`validateProductionEnv`).
- API-key + RBAC enforcement unchanged and now covered by automated tests.

### Documentation & UX
- **Help Center** (`/help`) with getting-started, invoicing/payments, security, and developer articles.
- **Cookie Policy** (`/cookie-policy`); Privacy/Terms refreshed and cross-linked.
- **Launch Readiness dashboard** (`/dashboard/admin/launch-readiness`) — live score across environment, infrastructure, security, data, and quality.
- Generated reports: Architecture Review, Security Audit, Performance Benchmark, Database Optimization, Production Readiness, Technical Debt, Launch Checklist.

---

## Upgrade & Deploy

```bash
git pull
npm ci
npm run build
# Set production env (see .env.production.example), then:
docker compose up -d --remove-orphans
# Apply DB indexes:
npm run db:optimize
# Validate:
BASE_URL=https://app.kaziflow.co.ke node scripts/validate-system.mjs
```

## Known Issues / Trade-offs (see Technical Debt Report)
- ESLint is report-only (not build-blocking) pending a dedicated config pass.
- CSP permits `unsafe-inline`/`unsafe-eval` (required by Next.js RSC bootstrap).
- In-memory cache is the default; set `REDIS_URL` for shared cache.

## Compatibility
- No breaking API changes. Existing `/api/v1` contracts unchanged.
- Database: additive indexes only; no schema-breaking migrations.

## Acknowledgements
All 15+ business modules (CRM, Procurement, POS, HR, Payroll, Compliance, AI & Automation, Enterprise Analytics/Management, Developer Platform, Integration Hub, Business Timeline) are preserved and unaffected by this release.
