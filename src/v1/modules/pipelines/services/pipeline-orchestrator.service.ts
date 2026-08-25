import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import {
  PIPELINE_RUN_QUEUE,
  PIPELINE_RUN_JOB_NAME,
} from '../../../../core/worker/worker.constants';
import { PrismaService } from '../../../../core/database/prisma.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { RequestContextService } from '../../../../core/context/request-context.service';
import { ExecutionGraph } from '../../repositories/interfaces/stack-definition.interface';
import { JobStatus, PipelineRunStatus, TriggerType } from '@prisma/client';

@Injectable()
export class PipelineOrchestratorService {
  private readonly logger = new Logger(PipelineOrchestratorService.name);

  // System-level IDs for webhook-triggered runs — provisioned once on first use
  private static SYSTEM_ORG_SLUG = 'system-webhooks';
  private static SYSTEM_PROJECT_SLUG = 'webhook-builds';

  constructor(
    @InjectQueue(PIPELINE_RUN_QUEUE) private readonly pipelineQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly contextService?: RequestContextService,
  ) {}

  /**
   * Provisions the full entity chain (org → project → pipeline def → version → run → jobs)
   * then enqueues BullMQ jobs carrying the repoUrl so workers can clone and build.
   */
  async dispatchRun(
    pipelineRunId: string,
    graph: ExecutionGraph,
    repoUrl: string,
    commitSha?: string,
    branch?: string,
  ): Promise<{ runId: string; jobsEnqueued: number }> {
    this.logger.log(
      `▸ Orchestrating execution for Run '${pipelineRunId}' (${graph.stages.length} stages) · repo: ${repoUrl}`,
    );

    // ── 1. Ensure system organization exists ─────────────────────────────────
    const org = await this.safeUpsert(
      () =>
        this.prisma.organization.upsert({
          where: { slug: PipelineOrchestratorService.SYSTEM_ORG_SLUG },
          create: {
            name: 'OpsPilot System',
            slug: PipelineOrchestratorService.SYSTEM_ORG_SLUG,
            billingEmail: 'system@opspilot.internal',
          },
          update: {},
        }),
      () =>
        this.prisma.organization.findUniqueOrThrow({
          where: { slug: PipelineOrchestratorService.SYSTEM_ORG_SLUG },
        }),
    );

    // ── 2. Ensure system project exists ──────────────────────────────────────
    const project = await this.safeUpsert(
      () =>
        this.prisma.project.upsert({
          where: {
            organizationId_slug: {
              organizationId: org.id,
              slug: PipelineOrchestratorService.SYSTEM_PROJECT_SLUG,
            },
          },
          create: {
            organizationId: org.id,
            name: 'Webhook Builds',
            slug: PipelineOrchestratorService.SYSTEM_PROJECT_SLUG,
          },
          update: {},
        }),
      () =>
        this.prisma.project.findUniqueOrThrow({
          where: {
            organizationId_slug: {
              organizationId: org.id,
              slug: PipelineOrchestratorService.SYSTEM_PROJECT_SLUG,
            },
          },
        }),
    );

    // ── 3. Ensure pipeline definition exists per repo URL ────────────────────
    // Slug is a safe hash of the URL to stay within unique constraint
    const pipelineSlug = crypto.createHash('md5').update(repoUrl).digest('hex').slice(0, 32);

    const pipelineDef = await this.safeUpsert(
      () =>
        this.prisma.pipelineDefinition.upsert({
          where: { projectId_slug: { projectId: project.id, slug: pipelineSlug } },
          create: {
            projectId: project.id,
            name: `Build: ${repoUrl}`,
            slug: pipelineSlug,
            description: `Auto-provisioned pipeline for ${repoUrl}`,
            triggerType: TriggerType.GIT_PUSH,
            triggerBranch: branch || 'main',
          },
          update: {},
        }),
      () =>
        this.prisma.pipelineDefinition.findUniqueOrThrow({
          where: { projectId_slug: { projectId: project.id, slug: pipelineSlug } },
        }),
    );

    // ── 4. Ensure pipeline version 1 exists ──────────────────────────────────
    const pipelineVersion = await this.safeUpsert(
      () =>
        this.prisma.pipelineVersion.upsert({
          where: {
            pipelineDefinitionId_versionNumber: {
              pipelineDefinitionId: pipelineDef.id,
              versionNumber: 1,
            },
          },
          create: {
            pipelineDefinitionId: pipelineDef.id,
            versionNumber: 1,
            yamlConfig: `# Auto-generated for ${repoUrl}`,
            checksum: crypto.createHash('md5').update(repoUrl).digest('hex'),
            changeSummary: 'Webhook auto-provision',
          },
          update: {},
        }),
      () =>
        this.prisma.pipelineVersion.findUniqueOrThrow({
          where: {
            pipelineDefinitionId_versionNumber: {
              pipelineDefinitionId: pipelineDef.id,
              versionNumber: 1,
            },
          },
        }),
    );

    // ── 5. Create the PipelineRun record with a fixed ID ─────────────────────
    // Use upsert so webhook retries are idempotent
    const run = await this.safeUpsert(
      () =>
        this.prisma.pipelineRun.upsert({
          where: { id: pipelineRunId },
          create: {
            id: pipelineRunId,
            pipelineDefinitionId: pipelineDef.id,
            pipelineVersionId: pipelineVersion.id,
            status: PipelineRunStatus.QUEUED,
            triggerType: TriggerType.GIT_PUSH,
            triggeredBy: 'github-webhook',
            commitSha: commitSha || 'e6f8b1a2c3d4',
            branch: branch || 'main',
            queuedAt: new Date(),
          },
          update: {},
        }),
      () =>
        this.prisma.pipelineRun.findUniqueOrThrow({
          where: { id: pipelineRunId },
        }),
    );

    // ── 6. Create PipelineJob records for each stage ─────────────────────────
    const stageJobMap: Record<string, string> = {};
    for (const stage of graph.stages) {
      const jobId = `${pipelineRunId}_${stage.id}`;
      const dbJob = await this.safeUpsert(
        () =>
          this.prisma.pipelineJob.upsert({
            where: { id: jobId },
            create: {
              id: jobId,
              pipelineRunId: run.id,
              name: stage.name,
              stage: stage.stage,
              status: JobStatus.QUEUED,
            },
            update: {},
          }),
        () =>
          this.prisma.pipelineJob.findUniqueOrThrow({
            where: { id: jobId },
          }),
      );
      stageJobMap[stage.id] = dbJob.id;
      this.logger.log(`  ↳ PipelineJob '${dbJob.name}' created (stage: ${stage.stage})`);
    }

    // ── 7. Enqueue BullMQ run job referencing the real DB run ID ─────────────────
    const traceparent = this.contextService?.getTraceparent();

    await this.pipelineQueue.add(
      PIPELINE_RUN_JOB_NAME,
      {
        pipelineRunId: run.id,
        repoUrl,
        traceparent,
      },
      {
        jobId: `${run.id}_enq`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.run_dispatched.v1',
      aggregateId: run.id,
      aggregateType: 'PipelineRun',
      occurredOn: new Date(),
      version: 1,
      payload: {
        pipelineRunId: run.id,
        repoUrl,
        stagesCount: graph.stages.length,
        stages: graph.executionPlan,
      },
    });

    this.logger.log(
      `✓ Successfully enqueued ${graph.stages.length} stage jobs to BullMQ PIPELINE_RUN_QUEUE`,
    );

    return {
      runId: run.id,
      jobsEnqueued: graph.stages.length,
    };
  }

  private async safeUpsert<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'P2002' || errorObj?.message?.includes('Unique constraint failed')) {
        return await fallback();
      }
      throw err;
    }
  }
}
