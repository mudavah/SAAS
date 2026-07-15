# KaziFlow v1.0 — Launch Checklist (Epic 12)

Use this as the authoritative go/no-go list. Items map to `PRODUCTION_READINESS_REPORT.md` gates.

## A. Code & Quality (automated)
- [x] `npm run build` succeeds (standalone output)
- [x] `npx tsc --noEmit -p tsconfig.ci.json` clean
- [x] `npm test` green (39 new pure-logic tests)
- [x] CI workflow (`.github/workflows/ci.yml`) green on `main`
- [x] Security scan workflow (`security-scan.yml`) scheduled

## B. Infrastructure
- [ ] PostgreSQL provisioned (Neon/Supabase/RDS), pooled connection string in `DATABASE_URL`
- [ ] `npm run db:migrate` (or `db:push`) applied to prod database
- [ ] `npm run db:optimize` applied (composite indexes)
- [ ] Redis provisioned; `REDIS_URL` set (enables shared cache + distributed rate limiting)
- [ ] Docker image built & pushed: `ghcr.io/<org>/kaziflow:latest`
- [ ] `docker-compose up -d` brings up app + db + redis + nginx

## C. Secrets & Configuration
- [ ] `AUTH_SECRET` (openssl rand -base64 32)
- [ ] `APP_ENCRYPTION_KEY` (openssl rand -base64 32)
- [ ] `AUTH_URL`, `NEXT_PUBLIC_APP_URL` = https production URLs
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
- [ ] `OPENAI_API_KEY` (AI features)
- [ ] `RESEND_API_KEY`, `EMAIL_FROM`
- [ ] M-Pesa prod keys (optional)
- [ ] `validateProductionEnv()` reports green at boot (no missing required keys)

## D. Networking & TLS
- [ ] DNS A/AAAA for app + API domains
- [ ] TLS certificate (Let's Encrypt) mounted at `/etc/nginx/certs`
- [ ] HSTS preload submitted
- [ ] WAF / DDoS protection at edge (CDN)

## E. Observability
- [ ] Prometheus scraping `/api/metrics`
- [ ] Alertmanager rules (`monitoring/alert-rules.yml`) loaded
- [ ] Alerts routed to on-call (Slack/email/webhook)
- [ ] Sentry DSN set (optional; lazy-loaded)
- [ ] Grafana dashboard for latency/error/alert panels

## F. Backups & DR
- [ ] `scripts/backup-db.sh` scheduled (cron daily)
- [ ] Backups copied to object storage (`BACKUP_REMOTE`)
- [ ] Retention = 30 days
- [ ] One successful `restore-db.sh` drill documented
- [ ] RTO/RPO documented (target RTO ≤ 15 min, RPO = backup freq)

## G. Payments & Billing
- [ ] Stripe webhook endpoint live + signature verified
- [ ] Test a live charge → invoice marked paid
- [ ] M-Pesa STK push tested (if enabled)
- [ ] Plan limits enforced (free 5 invoices/10 clients)

## H. Legal & Docs
- [x] Privacy Policy (`/privacy`)
- [x] Terms of Service (`/terms`)
- [x] Cookie Policy (`/cookie-policy`)
- [x] Help Center (`/help`)
- [x] Launch Readiness dashboard (`/dashboard/admin/launch-readiness`)
- [ ] Data Processing Agreement template ready (enterprise)

## I. Pre-Launch Validation
- [ ] `BASE_URL=https://app.kaziflow.co.ke node scripts/validate-system.mjs` → PASSED
- [ ] k6 load test at 2× target load green (see PERFORMANCE_BENCHMARK_REPORT)
- [ ] Tenant isolation & RBAC test suites green in CI

## J. Go / No-Go
- [ ] Product sign-off
- [ ] Security sign-off (post S5 gate)
- [ ] DevOps sign-off (B–F green)
- [ ] **LAUNCH** 🚀

> See `PRODUCTION_DEPLOYMENT_CHECKLIST.md` for the step-by-step runbook and DR playbook.
