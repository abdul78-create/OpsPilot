/**
 * OpsPilot Pipeline-as-Code YAML Schema
 *
 * Defines the complete typed schema for .opspilot.yml files.
 *
 * Example minimal pipeline:
 * ```yaml
 * version: "1"
 * name: "My App CI/CD"
 * trigger:
 *   on: [push, pull_request]
 *   branches: [main, "release/*"]
 * jobs:
 *   build:
 *     image: node:20-alpine
 *     commands:
 *       - npm ci
 *       - npm run build
 *   test:
 *     image: node:20-alpine
 *     needs: [build]
 *     commands:
 *       - npm test -- --ci
 *     artifacts:
 *       paths: [coverage/]
 *   deploy:
 *     image: alpine:latest
 *     needs: [test]
 *     commands:
 *       - ./scripts/deploy.sh
 *     environment:
 *       DEPLOY_ENV: production
 * ```
 */

// ─── Trigger Schema ────────────────────────────────────────────────────────────

export type TriggerEvent = 'push' | 'pull_request' | 'tag' | 'schedule' | 'manual';

export interface PipelineTrigger {
  /** Events that activate this pipeline. Default: [push] */
  on: TriggerEvent[];
  /** Branch patterns to match (glob-style). Default: ['*'] */
  branches?: string[];
  /** Tag patterns to match. Default: [] */
  tags?: string[];
  /** Cron expression for scheduled triggers */
  cron?: string;
}

// ─── Job Schema ────────────────────────────────────────────────────────────────

export interface JobArtifacts {
  /** Paths to upload as artifacts after the job completes */
  paths: string[];
  /** Number of days to retain artifacts. Default: 7 */
  retentionDays?: number;
}

export interface JobRetryPolicy {
  /** Maximum number of retry attempts. Default: 0 */
  maxAttempts: number;
  /** Delay between retries in seconds. Default: 30 */
  delaySeconds?: number;
}

export interface PipelineJob {
  /** Docker image to run this job in */
  image: string;
  /** Shell commands to execute in order */
  commands: string[];
  /** Job IDs this job depends on (DAG edges) */
  needs?: string[];
  /** Environment variables injected into the job container */
  environment?: Record<string, string>;
  /** Artifacts produced by this job */
  artifacts?: JobArtifacts;
  /** Timeout in seconds. Default: 600 */
  timeoutSeconds?: number;
  /** Retry policy on failure */
  retry?: JobRetryPolicy;
  /** Whether to continue pipeline on failure. Default: false */
  continueOnError?: boolean;
  /** Arbitrary stage label (build/test/deploy/security). Auto-inferred if not set. */
  stage?: string;
}

// ─── Top-Level Pipeline Schema ─────────────────────────────────────────────────

export interface OpsPilotPipelineSchema {
  /** Schema version. Must be "1". */
  version: string;
  /** Human-readable pipeline name */
  name: string;
  /** Trigger configuration */
  trigger?: PipelineTrigger;
  /** Map of job ID → job definition */
  jobs: Record<string, PipelineJob>;
  /** Global environment variables available to all jobs */
  environment?: Record<string, string>;
}

// ─── Compilation Result ────────────────────────────────────────────────────────

export interface PipelineParseError {
  field: string;
  message: string;
}

export interface CompiledPipelineJob {
  /** Unique job identifier (key from YAML jobs map) */
  id: string;
  /** Resolved display name */
  name: string;
  /** Docker image */
  image: string;
  /** Commands to execute */
  commands: string[];
  /** Resolved stage label */
  stage: string;
  /** Resolved dependency IDs (validated against jobs map) */
  needs: string[];
  /** Merged environment (global + job-level) */
  environment: Record<string, string>;
  /** Artifacts to collect after job completion */
  artifacts: string[];
  /** Timeout in seconds */
  timeoutSeconds: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay seconds */
  retryDelaySeconds: number;
  /** Topological order index (0 = first group to run) */
  topoOrder: number;
  /** Whether failure should block downstream jobs */
  continueOnError: boolean;
}

export interface CompiledPipeline {
  /** Whether the pipeline compiled without errors */
  valid: boolean;
  /** Pipeline schema version */
  version: string;
  /** Pipeline name */
  name: string;
  /** Resolved trigger configuration */
  trigger: Required<PipelineTrigger>;
  /** Compiled and validated jobs in topological execution order */
  jobs: CompiledPipelineJob[];
  /** Ordered execution plan (job IDs in execution order) */
  executionPlan: string[][];
  /** Any validation errors or warnings encountered */
  errors: PipelineParseError[];
  /** SHA-256 checksum of the canonical YAML content */
  checksum: string;
}
