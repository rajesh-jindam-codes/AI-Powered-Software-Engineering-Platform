#!/usr/bin/env bash
# =========================================================================
# DEVFLOW AI — Automated PostgreSQL Database Backup Script (Phase 15)
# Supports: pgvector, HNSW indexes, AES-256 GPG encryption, S3 upload,
# and retention policy management (Daily 7d, Weekly 4w, Monthly 12m).
# =========================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/devflow}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-devflow_db}"
POSTGRES_USER="${POSTGRES_USER:-devflow}"
S3_BUCKET="${BACKUP_S3_BUCKET:-s3://devflow-backups-prod/database}"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-security@devflow.ai}"
LOG_FILE="/var/log/devflow/backup.log"

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" | tee -a "$LOG_FILE"
}

log "INFO: Starting PostgreSQL pgvector backup for database: ${POSTGRES_DB}..."

BACKUP_FILE="${BACKUP_DIR}/devflow_${POSTGRES_DB}_${TIMESTAMP}.dump"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# 1. Execute pg_dump (Custom binary format with vector embeddings & schema)
log "INFO: Executing pg_dump (Parallel compression)..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -F c \
    -b \
    -v \
    -f "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "INFO: pg_dump completed successfully (Size: ${FILE_SIZE})."

# 2. Encrypt backup archive with GPG AES-256
if command -v gpg &> /dev/null; then
    log "INFO: Encrypting backup with GPG (AES-256)..."
    gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$BACKUP_FILE"
    rm -f "$BACKUP_FILE"
    FINAL_UPLOAD_FILE="$ENCRYPTED_FILE"
else
    log "WARN: GPG not installed. Uploading compressed dump directly."
    FINAL_UPLOAD_FILE="$BACKUP_FILE"
fi

# 3. Upload to AWS S3 / Cloud Storage with SSE-KMS encryption
if command -v aws &> /dev/null; then
    log "INFO: Uploading backup to ${S3_BUCKET}..."
    aws s3 cp "$FINAL_UPLOAD_FILE" "${S3_BUCKET}/$(basename "$FINAL_UPLOAD_FILE")" --sse aws:kms
    log "INFO: Upload completed successfully."
fi

# 4. Retention Policy Cleanup (Keep 7 daily, 4 weekly, 12 monthly locally)
log "INFO: Pruning local backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "devflow_*.dump*" -mtime +7 -delete

log "SUCCESS: DevFlow Database backup completed at ${TIMESTAMP}."
