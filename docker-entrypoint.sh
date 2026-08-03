#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpsPilot AI — Backend Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "→ Checking database for failed migrations..."
node prisma/prisma-cleanup.js

echo "→ Running database migrations..."
npx prisma migrate deploy

echo "→ Starting NestJS server..."
exec node dist/main
