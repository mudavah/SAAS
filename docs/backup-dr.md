# KaziFlow OS — Backup & Disaster Recovery

## 1. Backup Strategy

| Layer | Method | Frequency | Retention |
|-------|--------|-----------|-----------|
| PostgreSQL | Managed snapshot + `pg_dump` (`scripts/backup-db.sh`) | Daily + PITR | 35 days |
| Object storage | Versioned blobs (invoices, exports) | Continuous | 90 days |
| Config/Secrets | Encrypted secret manager (not in repo) | On change | Indefinite |
| Redis | Best-effort AOF (cache only — rebuildable) | n/a | n/a |

## 2. Backup Procedures

```bash
# Full logical dump to object storage
scripts/backup-db.sh

# Apply production indexes (idempotent)
npm run db:optimize

# Verify last backup integrity
scripts/verify-backup.sh
```

## 3. Restore Procedures

```bash
# Restore latest (or specify timestamp)
scripts/restore-db.sh --latest
# or
scripts/restore-db.sh --time "2026-07-15T02:00:00Z"
```

Restore is performed into a **staging copy first**, validated with `scripts/validate-system.mjs`, then promoted.

## 4. RTO / RPO Targets

| Objective | Target |
|-----------|--------|
| RPO (data loss) | ≤ 5 minutes (PITR) |
| RTO (recovery) | ≤ 1 hour (managed PG) / ≤ 4 hours (full rebuild) |

## 5. Disaster Scenarios

| Scenario | Response |
|----------|----------|
| DB instance loss | Promote managed replica / restore PITR snapshot. |
| Corrupted row (single tenant) | Restore tenant slice from dump; re-run `db:optimize`. |
| Accidental delete | Point-in-time restore to pre-delete; reconcile via audit logs. |
| Region outage | Fail over to secondary region; update `AUTH_URL`/`NEXT_PUBLIC_APP_URL`; repoint DNS. |
| Encryption-key loss | Secrets unrecoverable — rotate provider keys; re-enter via Settings. |

## 6. Validation

- `scripts/validate-system.mjs` asserts DB connectivity, indexes, cache round-trip, and key routes.
- Load tests (`scripts/load/k6-*.js`) validate capacity post-restore.

## 7. Encryption at Rest

Integration credentials (Stripe, M-Pesa passkey), eTIMS PIN/API key are encrypted via `APP_ENCRYPTION_KEY` (`src/lib/crypto.ts`). Backups of these tables remain encrypted; key is **never** backed up alongside data.

## 8. Backward Compatibility

No destructive schema changes. New columns are nullable with safe defaults. Restore tooling is non-destructive to the running primary until explicit promotion.
