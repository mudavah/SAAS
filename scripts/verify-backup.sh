#!/usr/bin/env bash
# KaziFlow — backup verification (Disaster Recovery)
# ------------------------------------------------------------------------------
# Confirms a backup file is a valid, non-empty PostgreSQL dump and reports the
# object count it contains. Run after every backup (and in DR drills) so a bad
# backup is caught before it is needed.
#
# Usage: ./scripts/verify-backup.sh path/to/backup.sql.gz

set -euo pipefail

BACKUP="${1:-}"
if [[ -z "$BACKUP" || ! -f "$BACKUP" ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

if ! gzip -dc "$BACKUP" | grep -q "PostgreSQL database dump"; then
  echo "ERROR: not a valid PostgreSQL dump: $BACKUP" >&2
  exit 1
fi

# Count tables/relations present in the dump (rough completeness signal).
TABLES=$(gzip -dc "$BACKUP" | grep -cE "^CREATE TABLE" || true)
INDEXES=$(gzip -dc "$BACKUP" | grep -cE "^CREATE INDEX|^CREATE UNIQUE INDEX" || true)

SIZE=$(stat -c%s "$BACKUP" 2>/dev/null || echo 0)
echo "[verify] OK: $BACKUP"
echo "[verify]   size:    ${SIZE} bytes"
echo "[verify]   tables:  ${TABLES}"
echo "[verify]   indexes: ${INDEXES}"

if [[ "$TABLES" -lt 20 ]]; then
  echo "ERROR: dump looks incomplete (fewer than 20 tables)." >&2
  exit 1
fi
echo "[verify] completeness check passed"
