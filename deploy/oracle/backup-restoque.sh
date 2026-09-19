#!/usr/bin/env bash
set -euo pipefail

DB_FILE=/var/lib/restoque/restoque.db
BACKUP_DIR=/var/backups/restoque
STAMP=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/restoque-$STAMP.db'"
find "$BACKUP_DIR" -type f -name 'restoque-*.db' -mtime +14 -delete
