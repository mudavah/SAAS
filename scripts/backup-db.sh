#!/usr/bin/env bash
# KaziFlow — automated PostgreSQL backup (Automated Backups & Disaster Recovery)
# ------------------------------------------------------------------------------
# Creates a compressed, timestamped logical dump of the KaziFlow database,
# verifies it, and prunes old backups to keep storage bounded. Designed to be
# run from cron (see Backup & DR playbook in PRODUCTION_DEPLOYMENT_CHECKLIST.md).
#
# Usage:
#   ./scripts/backup-db.sh            # uses DATABASE_URL / PG* env
#   BACKUP_DIR=/backups ./scripts/backup-db.sh
#
# Recommended cron (daily 02:00, keep 30 days):
#   0 2 * * *  /opt/kaziflow/scripts/backup-db.sh >> /var/log/kaziflow-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PREFIX="kaziflow"
OUT="${BACKUP_DIR}/${PREFIX}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Ensure we have a target. Prefer DATABASE_URL, else PG* vars.
if [[ -z "${DATABASE_URL:-}" && -z "${PGDATABASE:-}" ]]; then
  echo "ERROR: set DATABASE_URL or PG* environment variables." >&2
  exit 1
fi

echo "[backup] starting at ${TIMESTAMP}"
if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$OUT"
else
  pg_dump --no-owner --no-privileges | gzip > "$OUT"
fi

SIZE=$(stat -c%s "$OUT" 2>/dev/null || echo 0)
if [[ "$SIZE" -lt 64 ]]; then
  echo "ERROR: backup suspiciously small (${SIZE} bytes) — aborting." >&2
  rm -f "$OUT"
  exit 1
fi

echo "[backup] wrote ${OUT} (${SIZE} bytes)"

# Verify the dump can be listed (integrity check without a full restore).
if gzip -dc "$OUT" | pg_restore --list >/dev/null 2>&1 || gzip -dc "$OUT" | grep -q "PostgreSQL database dump"; then
  echo "[backup] integrity check OK"
else
  echo "ERROR: backup integrity check failed." >&2
  exit 1
fi

# Prune old backups.
DELETED=$(find "$BACKUP_DIR" -name "${PREFIX}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete 2>/dev/null | wc -l || echo 0)
echo "[backup] pruned ${DELETED} backups older than ${RETENTION_DAYS} days"

# Copy to remote store if configured (e.g. S3 / object storage).
if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  echo "[backup] syncing to ${BACKUP_REMOTE}"
  aws s3 cp "$OUT" "${BACKUP_REMOTE}/" || echo "[backup] WARN: remote sync failed"
fi

echo "[backup] done"
