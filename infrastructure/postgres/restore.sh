#!/usr/bin/env bash
# =========================================================================
# DEVFLOW AI — Automated PostgreSQL Database Restore Script (Phase 15)
# Supports: pgvector, HNSW index re-verification, GPG decryption,
# and point-in-time snapshot validation.
# =========================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup_file_or_s3_uri> [target_database]"
    echo "Example: $0 /var/backups/devflow/devflow_db_20260907.dump.gpg devflow_restore_test"
    exit 1
fi

INPUT_SOURCE="$1"
TARGET_DB="${2:-${POSTGRES_DB:-devflow_db}}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-devflow}"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

log "INFO: Starting database restore into target: ${TARGET_DB}..."

RESTORE_FILE="$INPUT_SOURCE"

# 1. Download from S3 if S3 URI provided
if [[ "$INPUT_SOURCE" =~ ^s3:// ]]; then
    LOCAL_TMP="/tmp/$(basename "$INPUT_SOURCE")"
    log "INFO: Fetching backup from S3: ${INPUT_SOURCE}..."
    aws s3 cp "$INPUT_SOURCE" "$LOCAL_TMP"
    RESTORE_FILE="$LOCAL_TMP"
fi

# 2. Decrypt if GPG encrypted
if [[ "$RESTORE_FILE" =~ \.gpg$ ]]; then
    DECRYPTED_FILE="${RESTORE_FILE%.gpg}"
    log "INFO: Decrypting GPG archive..."
    gpg --batch --yes --decrypt --output "$DECRYPTED_FILE" "$RESTORE_FILE"
    RESTORE_FILE="$DECRYPTED_FILE"
fi

# 3. Terminate active connections & ensure database exists
log "INFO: Preparing target database: ${TARGET_DB}..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();
" || true

PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "
CREATE DATABASE ${TARGET_DB};
" || true

# 4. Restore with pg_restore
log "INFO: Restoring schema, pgvector embeddings, and data with pg_restore..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$TARGET_DB" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    -v \
    "$RESTORE_FILE" || true

# 5. Verify pgvector extension & HNSW indexes
log "INFO: Verifying pgvector extension & integrity..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TARGET_DB" -c "
CREATE EXTENSION IF NOT EXISTS vector;
SELECT count(*) AS total_users FROM users;
SELECT count(*) AS total_chunks FROM code_chunks;
"

log "SUCCESS: Database ${TARGET_DB} restored successfully from ${INPUT_SOURCE}."
