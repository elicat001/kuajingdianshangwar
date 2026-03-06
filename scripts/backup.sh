#!/usr/bin/env bash
# PostgreSQL backup script for AI Commerce War OS
# Usage: ./backup.sh [daily|weekly]
# Recommended cron:
#   0 3 * * * /path/to/backup.sh daily
#   0 4 * * 0 /path/to/backup.sh weekly

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETAIN_DAILY="${RETAIN_DAILY:-7}"
RETAIN_WEEKLY="${RETAIN_WEEKLY:-4}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-postgres}"
DB_NAME="${DB_DATABASE:-ai_commerce_war}"

mkdir -p "${BACKUP_DIR}/${BACKUP_TYPE}"

FILENAME="${BACKUP_DIR}/${BACKUP_TYPE}/${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting ${BACKUP_TYPE} backup → ${FILENAME}"

PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --verbose \
  2>/dev/null \
  | gzip > "${FILENAME}"

FILESIZE=$(du -sh "${FILENAME}" | cut -f1)
echo "[$(date)] Backup complete: ${FILENAME} (${FILESIZE})"

# Cleanup old backups
if [ "${BACKUP_TYPE}" = "daily" ]; then
  RETAIN="${RETAIN_DAILY}"
else
  RETAIN="${RETAIN_WEEKLY}"
fi

echo "[$(date)] Cleaning backups older than ${RETAIN} copies..."
ls -tp "${BACKUP_DIR}/${BACKUP_TYPE}/" | tail -n +$((RETAIN + 1)) | while read -r OLD; do
  rm -f "${BACKUP_DIR}/${BACKUP_TYPE}/${OLD}"
  echo "  Removed: ${OLD}"
done

echo "[$(date)] Backup job finished."
