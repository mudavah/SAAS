# KaziFlow OS — Blue/Green Deployment

**Status:** Reference runbook (additive). Enables zero-downtime production releases alongside the existing Compose/CI flow.

## 1. Goal

Ship new versions with **zero downtime** and instant rollback. Two identical environments — **Blue** (live) and **Green** (idle/next) — share the database and Redis. Only one serves production traffic at a time.

## 2. Prerequisites

- Shared PostgreSQL + Redis (state is external to app instances).
- Load balancer / ingress that can flip the active pool.
- Health endpoints: `/api/health/live` (liveness), `/api/health/ready` (readiness).
- Container images tagged immutably (`v1.x.x`, `staging`).

## 3. Pipeline

```
1. Build image (next build → standalone)            [CI gate: lint + typecheck]
2. Push image with semantic tag
3. Deploy GREEN (new version) alongside BLUE
4. Run migrations on shared DB (idempotent: db:migrate)
       - Migrations MUST be backward compatible (additive only)
5. Warm GREEN: hit /api/health/ready until 200
6. Smoke test GREEN internally (scripts/validate-system.mjs)
7. Flip LB/ingress: BLUE -> GREEN
8. Monitor (Prometheus/alerts) for error rate + latency
9. Keep BLUE warm for N minutes (fast rollback)
10. Drain & scale down BLUE
```

## 4. Rollback

If error rate / latency breaches thresholds post-flip:
```bash
# Flip traffic back to BLUE (last-known-good)
lb set-active-pool blue
# GREEN left running for diagnosis; scale down after resolution
```
No DB rollback required because migrations are additive. If a migration were destructive (avoid), restore from PITR per `docs/backup-dr.md`.

## 5. Migration Safety

- All DB changes are **additive** (new nullable columns, new tables, new indexes).
- `npm run db:optimize` is idempotent and safe to run on deploy.
- Never rename/drop columns in a blue/green window.

## 6. Database Considerations

Both environments share one DB. To support schema-divergent cutovers, use the expand/contract pattern:
- **Expand:** add new columns/tables (Green reads/writes them; Blue ignores them).
- **Cutover:** flip traffic.
- **Contract:** remove old columns only after Blue is retired (next window).

## 7. Verification

- `scripts/validate-system.mjs` — asserts DB, cache, key routes post-deploy.
- k6 load tests (`scripts/load/k6-*.js`) on GREEN before cutover (optional pre-flight).

## 8. Backward Compatibility

Blue/green is a deployment strategy, not a code change. It composes with the existing Compose, Docker, and CI setup. The only hard requirement it imposes on the app is **additive migrations** — already enforced by convention.
