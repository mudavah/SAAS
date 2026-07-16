# KaziFlow OS — Deployment Guide

**Covers:** Docker, NGINX, CI/CD, monitoring, centralized logging, health checks, automated backups.

## 1. Containerization

- `Dockerfile` — multi-stage, `output: "standalone"` Next.js build, non-root user.
- `docker-compose.yml` (production) and `docker-compose.staging.yml` (staging) orchestrate `app`, `db` (PostgreSQL), `redis` (shared cache + distributed rate limiting), and `nginx`.
- Image tags: `latest`, `v1.x.x` (prod); `staging` (staging).

## 2. NGINX

`nginx.conf` terminates TLS, enforces HSTS, proxies `/` to the Node standalone server, serves static assets, and rate-limits per-IP. Security headers are also set at the Next.js layer (`next.config.ts` headers()).

## 3. CI/CD

- Lint + TypeScript typecheck run in CI (`tsconfig.ci.json`, `eslint.ignoreDuringBuilds: false`).
- `next build` is the gate; failing builds block promotion.
- Staging deploy via `docker compose -f docker-compose.staging.yml up -d`; validate with `scripts/validate-system.mjs` and load tests (`scripts/load/k6-*.js`).

## 4. Monitoring

- `monitoring/prometheus.yml`, `alert-rules.yml`, `alertmanager.yml` — scrape `/api/metrics`, `/api/admin/metrics`; alert on error rate, latency, queue depth.
- Health endpoints:
  - `GET /api/health/live` — liveness.
  - `GET /api/health/ready` — readiness (DB + cache probe).
  - `GET /api/health/full` — full subsystem report.

## 5. Centralized Logging

Structured logging via `src/lib/logger.ts` (leveled, JSON in prod). In containerized deploys, logs stream to stdout for collection by the platform's log aggregator (ELK/Loki/Datadog). Sensitive payloads are stripped before storage (`paymentWebhookLogs` sanitization).

## 6. Health Checks

Wired into the load balancer/orchestrator. `ready` verifies DB connectivity and a cache round-trip (Redis when `REDIS_URL` set, else in-memory).

## 7. Automated Backups

- `scripts/backup-db.sh` — managed PostgreSQL dump (or `pg_dump`) to object storage; retention policy.
- `scripts/restore-db.sh` — point-in-time or latest restore.
- `scripts/verify-backup.sh` — integrity check (size + restore dry-run).
- DB indexes applied via `npm run db:optimize` (`scripts/apply-db-indexes.mjs`).

## 8. Infrastructure as Code & Zero-Downtime Deploys

- **Terraform (IaC):** `docs/iac-terraform.md` — reproducible VPC, compute, managed PostgreSQL (PITR), Redis, object storage, TLS, and Prometheus scrape targets. Optional; composes with the Compose path.
- **Blue/Green deployment:** `docs/blue-green-deployment.md` — zero-downtime cutover with instant rollback. Requires **additive-only migrations** (already enforced by convention) so both pools can share one database during the window.

## 9. Required Environment (fail-closed)
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_ENCRYPTION_KEY`. Optional but recommended: `REDIS_URL`, `STRIPE_*`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `MPESA_*`, `SENTRY_DSN`. See `docs/STAGING_DEPLOYMENT.md` and `.env.production.example`.
