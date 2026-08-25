#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpsPilot AI — Backend Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run Prisma schema migrations on startup if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying Prisma database migrations..."
  npx prisma migrate deploy || echo "⚠️ Migration deploy note: check connection/permissions"
fi

echo "→ Starting NestJS server..."
exec node dist/main
