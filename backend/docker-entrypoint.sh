#!/bin/bash
set -e

# Wait for db to be ready (db service has healthcheck, but add buffer)
sleep 5

# Apply schema using raw SQL (prisma db push may have write permission issues)
# Parse DATABASE_URL to extract password and host (postgresql://user:pass@host:port/db)
echo "Applying database schema..."
if [ -n "$DATABASE_URL" ]; then
  # Extract password and host from DATABASE_URL
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's#postgresql://[^:]*:\([^@]*\)@.*#\1#p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's#postgresql://[^@]*@\([^:]*\):.*#\1#p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's#postgresql://[^@]*@[^:]*:\([^/]*\)/.*#\1#p')
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's#postgresql://\([^:]*\):.*#\1#p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's#postgresql://[^@]*@[^/]*/\(.*\)#\1#p')
fi
DB_PASS=${DB_PASS:-dining_password_2026}
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-dining_user}
DB_NAME=${DB_NAME:-dining_feedback}

PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /app/sql/init.sql 2>/dev/null || \
echo "Schema may already exist, skipping..."

echo "Starting server..."
exec node src/index.js "$@"
