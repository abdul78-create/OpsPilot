-- AddMeta: add optional metadata jsonb column to pipeline_runs for demo mode flag
-- Non-destructive additive migration.
ALTER TABLE "pipeline_runs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
