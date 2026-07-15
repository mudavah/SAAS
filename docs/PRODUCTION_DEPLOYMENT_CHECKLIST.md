# KaziFlow — Production Deployment Checklist & Runbook (Epic 12)

Operational runbook accompanying the Launch Checklist. Covers build, deploy, backups, and disaster recovery.

---

## 1. Prerequisites
- Node 20+, Docker 24+, PostgreSQL 16, Redis 7.
- A container registry (GHCR) or private registry.
- DNS + TLS certs for app/API domains.

## 2. Build & Push Image
```bash
docker build -t kaziflow:$(git describe --tags) -t kaziflow:latest .
docker tag kaziflow:latest ghcr.io/<org>/kaziflow:latest
docker push ghcr.io/<org>/kaziflow:latest
```
CI does this automatically on tag push (`deploy.yml`).

## 3. Configure Environment
Copy `.env.production.example` → `.env` (or your secret manager). Minimum required:
`DATABASE_URL, AUTH_SECRET, AUTH_URL, NEXT_PUBLIC_APP_URL, APP_ENCRYPTION_KEY`.
Recommended: `REDIS_URL, STRIPE_*, OPENAI_API_KEY, RESEND_API_KEY`.

## 4. Database
```bash
npm run db:migrate        # apply migrations
npm run db:optimize       # apply composite indexes (scripts/db-optimize.sql)
```

## 5. Deploy (Docker Compose)
```bash
cd /opt/kaziflow
docker compose pull
docker compose up -d --remove-orphans
curl -fsS http://localhost:3000/api/health/ready   # expect {"status":"ready"}
```

## 6. Validate
```bash
BASE_URL=https://app.kaziflow.co.ke node scripts/validate-system.mjs
```
Must print `VALIDATION PASSED` (health, metrics, headers, env).

## 7. Load Test (staging)
```bash
k6 run --env BASE_URL=https://staging.kaziflow.co.ke scripts/load/k6-api.js
k6 run --env BASE_URL=https://staging.kaziflow.co.ke scripts/load/k6-invoices.js
```

## 8. Backups (Automated)
Add to crontab (daily 02:00, keep 30 days):
```cron
0 2 * * *  /opt/kaziflow/scripts/backup-db.sh >> /var/log/kaziflow-backup.log 2>&1
```
With object-store sync: `BACKUP_REMOTE=s3://kaziflow-backups /opt/kaziflow/scripts/backup-db.sh`.

Verify anytime:
```bash
./scripts/verify-backup.sh backups/kaziflow_YYYYMMDDTHHMMSSZ.sql.gz
```

## 9. Disaster Recovery Playbook
**Scenario:** Primary database corrupted/lost.
1. Identify latest verified backup: `ls -t backups/ | head -n1`.
2. Provision a clean target DB; set `DATABASE_URL` to it.
3. Restore: `./scripts/restore-db.sh backups/<latest>.sql.gz` (typing `yes` to confirm overwrite).
4. Re-apply indexes: `npm run db:optimize`.
5. Redeploy app: `docker compose up -d`.
6. Validate: `node scripts/validate-system.mjs`.
**Target RTO ≤ 15 min, RPO = backup frequency (default daily).**

## 10. Rollback
Keep the previous image tag. To roll back:
```bash
docker compose down
docker tag ghcr.io/<org>/kaziflow:<prev> kaziflow:latest
docker compose up -d
```

## 11. Monitoring
- Scrape `/api/metrics` with Prometheus (`monitoring/prometheus.yml`).
- Load alert rules (`monitoring/alert-rules.yml`) into Alertmanager (`monitoring/alertmanager.yml`).
- Dashboard panels: `kaziflow_api_latency_p95_ms`, `kaziflow_error_rate`, `kaziflow_alerts_critical`.

## 12. Post-Launch
- Watch alerts 24h; keep prior image for instant rollback.
- Schedule external pentest (≤30 days).
- Promote ESLint to blocking; tighten CSP to nonce-based.
