#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpsPilot AI — Backend Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "→ Syncing database schema..."
npx prisma@5 db push --accept-data-loss --skip-generate

echo "→ Starting NestJS server..."
exec node dist/main
