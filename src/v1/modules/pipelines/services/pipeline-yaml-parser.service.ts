import { Injectable, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml');
import { createHash } from 'crypto';
import {
  PipelineTrigger,
  CompiledPipeline,
  CompiledPipelineJob,
  PipelineParseError,
  TriggerEvent,
} from '../interfaces/pipeline-schema.interface';
import {
  ExecutionGraph,
  ExecutionStage,
} from '../../repositories/interfaces/stack-definition.interface';

// ─── Stage Inference ───────────────────────────────────────────────────────────

const STAGE_KEYWORDS: Record<string, string> = {
  build: 'build',
  compile: 'build',
  install: 'build',
  lint: 'build',
  test: 'test',
  spec: 'test',
  unit: 'test',
  integration: 'test',
  e2e: 'test',
  security: 'security',
  scan: 'security',
  sast: 'security',
  snyk: 'security',
  deploy: 'deploy',
  release: 'deploy',
  publish: 'deploy',
  push: 'deploy',
  docker: 'deploy',
};

function inferStage(jobId: string, explicitStage?: string): string {
  if (explicitStage) return explicitStage;
  const lower = jobId.toLowerCase();
  for (const [keyword, stage] of Object.entries(STAGE_KEYWORDS)) {
    if (lower.includes(keyword)) return stage;
  }
  return 'build'; // default
}

// ─── YAML Parser & Validator ───────────────────────────────────────────────────

/**
 * PipelineYamlParserService
 *
 * The core Pipeline-as-Code engine for OpsPilot. It:
 * 1. Parses raw `.opspilot.yml` content using js-yaml (safe-load)
 * 2. Validates the parsed structure against the OpsPilotPipelineSchema
 * 3. Resolves DAG dependencies using Kahn's topological sort algorithm
 * 4. Detects cycles in the job dependency graph
 * 5. Merges global + job-level environment variables
 * 6. Compiles a fully-typed CompiledPipeline with execution order
 * 7. Converts CompiledPipeline → ExecutionGraph (legacy interface for worker dispatch)
 */
@Injectable()
export class PipelineYamlParserService {
  /**
   * Parses and compiles a raw YAML string into a fully-typed CompiledPipeline.
   * Throws BadRequestException if the YAML is syntactically invalid.
   * Returns compilation errors in result.errors for semantic/structural issues.
   */
  parseAndCompile(rawYaml: string, _pipelineId?: string): CompiledPipeline {
    if (!rawYaml || typeof rawYaml !== 'string' || !rawYaml.trim()) {
      throw new BadRequestException('Pipeline YAML cannot be empty');
    }

    // ── Step 1: Parse YAML (safe-load prevents code injection) ────────────────
    let raw: unknown;
    try {
      raw = yaml.load(rawYaml);
    } catch (err) {
      throw new BadRequestException(
        `Pipeline YAML syntax error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new BadRequestException('Pipeline YAML must be a mapping (object) at the top level');
    }

    const checksum = createHash('sha256').update(rawYaml).digest('hex');
    const doc = raw as Record<string, unknown>;
    const errors: PipelineParseError[] = [];

    // ── Step 2: Validate top-level required fields ────────────────────────────
    const version = this.requireString(doc, 'version', errors) ?? '1';
    const name = this.requireString(doc, 'name', errors) ?? 'Unnamed Pipeline';

    if (version !== '1' && version !== '"1"') {
      errors.push({ field: 'version', message: `Unsupported version '${version}'. Must be "1"` });
    }

    // ── Step 3: Parse trigger ─────────────────────────────────────────────────
    const trigger = this.parseTrigger(doc['trigger'], errors);

    // ── Step 4: Parse and validate jobs ───────────────────────────────────────
    const rawJobs = doc['jobs'];
    if (typeof rawJobs !== 'object' || rawJobs === null || Array.isArray(rawJobs)) {
      errors.push({
        field: 'jobs',
        message: '"jobs" must be a non-empty mapping of job definitions',
      });
    }

    const jobsMap =
      typeof rawJobs === 'object' && rawJobs !== null && !Array.isArray(rawJobs)
        ? (rawJobs as Record<string, unknown>)
        : {};

    const jobIds = Object.keys(jobsMap);
    if (jobIds.length === 0) {
      errors.push({ field: 'jobs', message: 'Pipeline must define at least one job' });
    }

    // ── Step 5: Validate and normalize each job ───────────────────────────────
    const globalEnv = this.parseEnvironment(doc['environment'], 'environment', errors);
    const parsedJobs: Map<string, CompiledPipelineJob> = new Map();

    for (const jobId of jobIds) {
      const rawJob = jobsMap[jobId];
      if (typeof rawJob !== 'object' || rawJob === null || Array.isArray(rawJob)) {
        errors.push({ field: `jobs.${jobId}`, message: `Job '${jobId}' must be an object` });
        continue;
      }

      const job = rawJob as Record<string, unknown>;
      const compiledJob = this.parseJob(jobId, job, globalEnv, errors);
      parsedJobs.set(jobId, compiledJob);
    }

    // ── Step 6: Validate dependency references ────────────────────────────────
    for (const [jobId, job] of parsedJobs) {
      for (const dep of job.needs) {
        if (!parsedJobs.has(dep)) {
          errors.push({
            field: `jobs.${jobId}.needs`,
            message: `Job '${jobId}' depends on unknown job '${dep}'`,
          });
        }
      }
    }

    // ── Step 7: Topological sort with cycle detection ─────────────────────────
    const topoResult = this.topologicalSort(parsedJobs);
    if (topoResult.hasCycle) {
      errors.push({
        field: 'jobs',
        message: `Circular dependency detected in jobs: ${topoResult.cycleNodes.join(' → ')}`,
      });
    }

    // Assign topological order to each job
    for (const [order, layer] of topoResult.layers.entries()) {
      for (const jobId of layer) {
        const job = parsedJobs.get(jobId);
        if (job) job.topoOrder = order;
      }
    }

    const compiledJobs = Array.from(parsedJobs.values()).sort(
      (a, b) => a.topoOrder - b.topoOrder || a.id.localeCompare(b.id),
    );

    return {
      valid: errors.length === 0,
      version,
      name,
      trigger,
      jobs: compiledJobs,
      executionPlan: topoResult.layers,
      errors,
      checksum,
    };
  }

  /**
   * Converts a CompiledPipeline into the legacy ExecutionGraph interface
   * used by PipelineOrchestratorService and BullMQ workers.
   */
  toExecutionGraph(compiled: CompiledPipeline, pipelineId: string): ExecutionGraph {
    const stages: ExecutionStage[] = compiled.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      stage: job.stage as ExecutionStage['stage'],
      image: job.image,
      commands: job.commands,
      dependsOn: job.needs,
      timeoutSeconds: job.timeoutSeconds,
      maxRetries: job.maxRetries,
      environment: job.environment,
      artifacts: job.artifacts,
    }));

    return {
      valid: compiled.valid,
      version: parseInt(compiled.version, 10) || 1,
      pipelineId,
      stages,
      executionPlan: compiled.executionPlan.flat(),
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private parseTrigger(raw: unknown, errors: PipelineParseError[]): Required<PipelineTrigger> {
    const defaults: Required<PipelineTrigger> = {
      on: ['push'],
      branches: ['*'],
      tags: [],
      cron: '',
    };

    if (raw === undefined || raw === null) return defaults;

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({ field: 'trigger', message: '"trigger" must be a mapping' });
      return defaults;
    }

    const t = raw as Record<string, unknown>;

    // Resolve "on" field
    let on: TriggerEvent[] = defaults.on;
    if (t['on'] !== undefined) {
      const rawOn = t['on'];
      if (typeof rawOn === 'string') {
        on = [rawOn as TriggerEvent];
      } else if (Array.isArray(rawOn)) {
        on = rawOn.filter((e): e is TriggerEvent =>
          ['push', 'pull_request', 'tag', 'schedule', 'manual'].includes(String(e)),
        );
      } else {
        errors.push({
          field: 'trigger.on',
          message: '"trigger.on" must be a string or array of events',
        });
      }
    }

    return {
      on,
      branches:
        this.parseStringArray(t['branches'], 'trigger.branches', errors) ?? defaults.branches,
      tags: this.parseStringArray(t['tags'], 'trigger.tags', errors) ?? [],
      cron: typeof t['cron'] === 'string' ? t['cron'] : '',
    };
  }

  private parseJob(
    jobId: string,
    raw: Record<string, unknown>,
    globalEnv: Record<string, string>,
    errors: PipelineParseError[],
  ): CompiledPipelineJob {
    const prefix = `jobs.${jobId}`;

    // Required: image
    const image = this.requireString(raw, 'image', errors, prefix);
    if (!image) {
      errors.push({ field: `${prefix}.image`, message: `Job '${jobId}' must specify an "image"` });
    }

    // Required: commands
    const commands = this.parseStringArray(raw['commands'], `${prefix}.commands`, errors);
    if (!commands || commands.length === 0) {
      errors.push({
        field: `${prefix}.commands`,
        message: `Job '${jobId}' must have at least one command`,
      });
    }

    // Optional fields
    const needs = this.parseStringArray(raw['needs'], `${prefix}.needs`, errors) ?? [];
    const jobEnv = this.parseEnvironment(raw['environment'], `${prefix}.environment`, errors);
    const mergedEnv = { ...globalEnv, ...jobEnv };

    const artifactsRaw = raw['artifacts'];
    let artifactPaths: string[] = [];
    if (typeof artifactsRaw === 'object' && artifactsRaw !== null && !Array.isArray(artifactsRaw)) {
      const artObj = artifactsRaw as Record<string, unknown>;
      artifactPaths =
        this.parseStringArray(artObj['paths'], `${prefix}.artifacts.paths`, errors) ?? [];
    } else if (Array.isArray(artifactsRaw)) {
      artifactPaths = artifactsRaw.map(String);
    }

    const retryRaw = raw['retry'];
    let maxRetries = 0;
    let retryDelay = 30;
    if (typeof retryRaw === 'object' && retryRaw !== null) {
      const r = retryRaw as Record<string, unknown>;
      maxRetries =
        typeof r['maxAttempts'] === 'number' ? Math.max(0, Math.min(r['maxAttempts'], 5)) : 0;
      retryDelay = typeof r['delaySeconds'] === 'number' ? r['delaySeconds'] : 30;
    } else if (typeof retryRaw === 'number') {
      maxRetries = Math.max(0, Math.min(retryRaw, 5));
    }

    const timeoutSeconds =
      typeof raw['timeoutSeconds'] === 'number' ? Math.max(10, raw['timeoutSeconds']) : 600;

    const continueOnError = raw['continueOnError'] === true;
    const stage = inferStage(jobId, typeof raw['stage'] === 'string' ? raw['stage'] : undefined);

    return {
      id: jobId,
      name: typeof raw['name'] === 'string' ? raw['name'] : jobId,
      image: image ?? 'alpine:latest',
      commands: commands ?? [],
      stage,
      needs,
      environment: mergedEnv,
      artifacts: artifactPaths,
      timeoutSeconds,
      maxRetries,
      retryDelaySeconds: retryDelay,
      topoOrder: 0, // Set by topological sort
      continueOnError,
    };
  }

  private parseEnvironment(
    raw: unknown,
    field: string,
    errors: PipelineParseError[],
  ): Record<string, string> {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({ field, message: `"${field}" must be a string-to-string mapping` });
      return {};
    }
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      result[k] = String(v);
    }
    return result;
  }

  private parseStringArray(
    raw: unknown,
    field: string,
    errors: PipelineParseError[],
  ): string[] | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'string') return [raw];
    if (!Array.isArray(raw)) {
      errors.push({ field, message: `"${field}" must be a string or array of strings` });
      return null;
    }
    return raw.map(String);
  }

  private requireString(
    obj: Record<string, unknown>,
    key: string,
    errors: PipelineParseError[],
    prefix?: string,
  ): string | null {
    const field = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val === undefined || val === null) {
      errors.push({ field, message: `"${key}" is required` });
      return null;
    }
    if (typeof val !== 'string' && typeof val !== 'number') {
      errors.push({ field, message: `"${key}" must be a string` });
      return null;
    }
    return String(val).replace(/^["']|["']$/g, ''); // strip surrounding quotes
  }

  // ─── Topological Sort (Kahn's Algorithm) ─────────────────────────────────────

  private topologicalSort(jobs: Map<string, CompiledPipelineJob>): {
    layers: string[][];
    hasCycle: boolean;
    cycleNodes: string[];
  } {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>(); // job → dependents

    for (const [id] of jobs) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    // Build adjacency and in-degree counts
    for (const [id, job] of jobs) {
      for (const dep of job.needs) {
        if (jobs.has(dep)) {
          adjList.get(dep)!.push(id);
          inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
        }
      }
    }

    // BFS layer-by-layer (Kahn's algorithm)
    const layers: string[][] = [];
    let queue = [...inDegree.entries()].filter(([, deg]) => deg === 0).map(([id]) => id);
    let processed = 0;

    while (queue.length > 0) {
      layers.push([...queue]);
      processed += queue.length;

      const nextQueue: string[] = [];
      for (const id of queue) {
        for (const dependent of adjList.get(id) ?? []) {
          const newDeg = (inDegree.get(dependent) ?? 0) - 1;
          inDegree.set(dependent, newDeg);
          if (newDeg === 0) {
            nextQueue.push(dependent);
          }
        }
      }
      queue = nextQueue;
    }

    if (processed < jobs.size) {
      // Cycle detected — find participating nodes
      const cycleNodes = [...inDegree.entries()].filter(([, deg]) => deg > 0).map(([id]) => id);
      return { layers, hasCycle: true, cycleNodes };
    }

    return { layers, hasCycle: false, cycleNodes: [] };
  }
}
