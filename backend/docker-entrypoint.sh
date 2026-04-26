#!/bin/bash
set -e

# Wait for db to be ready (db service has healthcheck, but add buffer)
sleep 5

# Apply schema using raw SQL (prisma db push may have write permission issues)
echo "Applying database schema..."
PGPASSWORD=dining_password_2026 psql -h db -U dining_user -d dining_feedback -f /app/sql/init.sql 2>/dev/null || \
echo "Schema may already exist, skipping..."

echo "Starting server..."
exec node src/index.js "$@"