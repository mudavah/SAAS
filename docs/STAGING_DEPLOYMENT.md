# KaziFlow — Staging Deployment Runbook

Deploys the KaziFlow application to a staging environment for load testing,
integration testing, and pre-production validation.

---

## 1. Prerequisites

- A VPS or cloud instance (Ubuntu 22.04+) with Docker Engine 24+ and Docker Compose v2+
- A domain/subdomain pointing to the instance (e.g. `staging.kaziflow.co.ke`)
- Ports `80`, `443`, and `8080` open in the firewall
- Git installed on the instance

## 2. One-Time Server Setup

```bash
# Clone the repository
git clone https://github.com/mudavah/SAAS.git /opt/kaziflow
cd /opt/kaziflow

# Create staging env file from template
cp .env.staging.example .env.staging

# Edit and fill in real values
nano .env.staging
```

Minimum required values in `.env.staging`:
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `APP_ENCRYPTION_KEY`

Recommended:
- `REDIS_URL` (uses `redis://redis:6379` by default via docker-compose)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (test mode)
- `OPENAI_API_KEY`
- `RESEND_API_KEY`

## 3. Build and Deploy

```bash
cd /opt/kaziflow

# Build the staging image
docker compose -f docker-compose.staging.yml build

# Start all services (app, db, redis, nginx)
docker compose -f docker-compose.staging.yml up -d --remove-orphans

# Watch logs for boot errors
docker compose -f docker-compose.staging.yml logs -f app
```

## 4. Post-Deploy Database Setup

```bash
# Run migrations (idempotent)
docker compose -f docker-compose.staging.yml exec app npx drizzle-kit migrate

# Apply production indexes
docker compose -f docker-compose.staging.yml exec app npm run db:optimize
```

## 5. Validate

```bash
# Health checks
curl -fsS http://localhost:3000/api/health/live
curl -fsS http://localhost:3000/api/health/ready
curl -fsS http://localhost:3000/api/health/full

# System validation (from host or inside container)
BASE_URL=http://staging.kaziflow.co.ke node scripts/validate-system.mjs
```

Expected: `VALIDATION PASSED`

## 6. Create Service API Key for Load Tests

Load tests need an authenticated API key. Create one from the dashboard or directly:

```bash
# Via API (requires admin auth token)
curl -X POST http://staging.kaziflow.co.ke/api/v1/api-keys \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "load-test-key", "expiresAt": "2026-12-31T23:59:59Z"}'
```

## 7. Run Load Tests

```bash
# API load test (1→20→100 VUs over 5 min)
k6 run --env BASE_URL=http://staging.kaziflow.co.ke --env API_KEY=<key> scripts/load/k6-api.js

# Invoice-heavy load test (50 invoices/min for 5 min)
k6 run --env BASE_URL=http://staging.kaziflow.co.ke --env API_KEY=<key> scripts/load/k6-invoices.js
```

### Load Test Thresholds

| Metric | Target |
|--------|--------|
| p95 latency | < 1000 ms |
| p99 latency | < 2000 ms |
| Error rate | < 1% |

## 8. Rollback

```bash
cd /opt/kaziflow
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d --remove-orphans
```

## 9. Differences from Production

| Aspect | Production | Staging |
|--------|-----------|---------|
| Image tag | `latest`, `v1.0.0` | `staging` |
| Database | Dedicated production DB | `kaziflow_staging` |
| Redis | Dedicated production Redis | Shared staging Redis |
| nginx ports | `80:80`, `443:443` | `8080:80`, `8443:443` |
| Rate limiting | Production thresholds | Same (can be tuned) |
| Payments | Live Stripe keys | Test Stripe keys |
| M-Pesa | Production sandbox/prod | Sandbox only |

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| `DATABASE_URL is required` | Ensure `.env.staging` is loaded or passed via `--env-file` |
| `APP_ENCRYPTION_KEY missing` | Set in `.env.staging`; fail-closed gate blocks boot |
| `db:optimize fails` | Run `drizzle-kit migrate` first |
| k6 auth errors | Ensure `API_KEY` is set and the key is active |
| Health check timeout | Check `docker compose logs app` for boot errors |
