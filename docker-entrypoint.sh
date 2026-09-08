#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpsPilot AI — Backend Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run Prisma schema migrations on startup if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying Prisma database migrations..."
  npx prisma migrate resolve --rolled-back 20260907000000_add_environment_connection_status 2>/dev/null || true
  npx prisma migrate deploy
fi

if [ $# -gt 0 ]; then
  echo "→ Executing command: $@"
  exec "$@"
else
  echo "→ Starting NestJS server..."
  exec node dist/main
fi

