#!/usr/bin/env bash
# Migration execution helper script for OpsPilot AI Backend
set -e

echo "==> Running Prisma Database Migrations..."
npx prisma migrate deploy

echo "==> Prisma Migrations Applied Successfully!"
