-- Add EnvironmentConnectionStatus enum
CREATE TYPE "EnvironmentConnectionStatus" AS ENUM (
  'NOT_CONFIGURED',
  'CONFIGURED',
  'CONNECTION_TESTING',
  'CONNECTED',
  'CONNECTION_FAILED',
  'UNSUPPORTED'
);

-- Add connection tracking columns to environments table
ALTER TABLE "environments"
  ADD COLUMN "connectionStatus" "EnvironmentConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  ADD COLUMN "credentialsConfigured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastConnectionTestedAt" TIMESTAMP(3),
  ADD COLUMN "lastConnectionError" TEXT;

-- Backfill: any environment that already has a deploymentTargetType set -> CONFIGURED
UPDATE "environments"
SET "connectionStatus" = 'CONFIGURED'
WHERE "deploymentTargetType" IS NOT NULL
  AND "deletedAt" IS NULL;
