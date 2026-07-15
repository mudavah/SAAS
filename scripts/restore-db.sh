#!/usr/bin/env bash
# KaziFlow — database restore (Disaster Recovery)
# ------------------------------------------------------------------------------
# Restores a KaziFlow logical dump produced by backup-db.sh into a target
# database. Use ONLY against a clean/intended target — this DROPS existing data.
#
# Usage:
#   ./scripts/restore-db.sh path/to/kaziflow_YYYYMMDDTHHMMSSZ.sql.gz
#   DATABASE_URL=postgres://u:p@host:5432/kaziflow_restore ./scripts/restore-db.sh backup.sql.gz

set -euo pipefail

BACKUP="${1:-}"
if [[ -z "$BACKUP" || ! -f "$BACKUP" ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" && -z "${PGDATABASE:-}" ]]; then
  echo "ERROR: set DATABASE_URL or PG* env to the RESTORE target." >&2
  exit 1
fi

echo "[restore] target: ${DATABASE_URL:-PGDATABASE=${PGDATABASE:-}}"
echo "[restore] source: $BACKUP"
read -r -p "This will OVERWRITE the target database. Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "[restore] aborted"
  exit 1
fi

echo "[restore] dropping public schema objects..."
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
  echo "[restore] loading dump..."
  gunzip -dc "$BACKUP" | psql "$DATABASE_URL" >/dev/null
else
  psql -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
  gunzip -dc "$BACKUP" | psql >/dev/null
fi

echo "[restore] done. Verify with: ./scripts/verify-backup.sh $BACKUP"
