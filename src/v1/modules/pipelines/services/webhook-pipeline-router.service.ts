import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  PIPELINE_RUN_QUEUE,
  PIPELINE_RUN_JOB_NAME,
} from '../../../../core/worker/worker.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { PipelineRunStatus, JobStatus, TriggerType, PipelineRun } from '@prisma/client';

export interface WebhookPushEvent {
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  commitMessage?: string;
  pusher: string;
  deliveryId?: string;
}

export interface WebhookDispatchResult {
  triggeredRuns: TriggeredRunSummary[];
  skippedPipelines: SkippedPipelineSummary[];
}

export interface TriggeredRunSummary {
  pipelineDefinitionId: string;
  pipelineName: string;
  pipelineRunId: string;
  organizationId: string;
  projectId: string;
  branch: string;
  commitSha: string;
}

export interface SkippedPipelineSummary {
  pipelineDefinitionId: string;
  pipelineName: string;
  reason: string;
}

/**
 * WebhookPipelineRouterService
 *
 * Core tenant-aware dispatch engine that connects incoming GitHub webhook push events
 * to real PipelineDefinition records in the OpsPilot database.
 *
 * Routing algorithm:
 * 1. Find all RepositoryConnection records matching the incoming repositoryUrl
 * 2. For each matched project, find active PipelineDefinitions with:
 *    - triggerType = GIT_PUSH
 *    - triggerBranch matches the pushed branch (or is wildcard '*')
 * 3. Create a PipelineRun + PipelineJob records per pipeline
 * 4. Enqueue each run to BullMQ for worker execution
 * 5. Publish domain events for each triggered run
 */
@Injectable()
export class WebhookPipelineRouterService {
  private readonly logger = new Logger(WebhookPipelineRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    @InjectQueue(PIPELINE_RUN_QUEUE) private readonly pipelineQueue: Queue,
  ) {}

  async routePushEvent(event: WebhookPushEvent): Promise<WebhookDispatchResult> {
    this.logger.log(
      `▸ Routing push event: repo=${event.repositoryUrl} branch=${event.branch} sha=${event.commitSha.slice(0, 8)}`,
    );

    const result: WebhookDispatchResult = {
      triggeredRuns: [],
      skippedPipelines: [],
    };

    // ── Step 1: Find all RepositoryConnections matching this repo URL ─────────
    const connections = await this.prisma.repositoryConnection.findMany({
      where: {
        repositoryUrl: event.repositoryUrl,
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            id: true,
            organizationId: true,
            status: true,
          },
        },
      },
    });

    if (connections.length === 0) {
      this.logger.warn(
        `No RepositoryConnection found for '${event.repositoryUrl}'. Webhook push ignored.`,
      );
      return result;
    }

    this.logger.log(
      `Found ${connections.length} RepositoryConnection(s) for '${event.repositoryUrl}'`,
    );

    // ── Step 2: For each matched connection, find eligible pipelines ──────────
    for (const connection of connections) {
      if (connection.project.status !== 'ACTIVE') {
        this.logger.debug(
          `Project '${connection.projectId}' is not ACTIVE — skipping all pipelines`,
        );
        continue;
      }

      const pipelines = await this.prisma.pipelineDefinition.findMany({
        where: {
          projectId: connection.projectId,
          isActive: true,
          deletedAt: null,
          triggerType: TriggerType.GIT_PUSH,
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      });

      for (const pipeline of pipelines) {
        // ── Step 3: Branch matching ─────────────────────────────────────────
        const triggerBranch = pipeline.triggerBranch || 'main';
        const branchMatches = triggerBranch === '*' || triggerBranch === event.branch;

        if (!branchMatches) {
          this.logger.debug(
            `Pipeline '${pipeline.name}' skipped — branch '${event.branch}' does not match trigger branch '${triggerBranch}'`,
          );
          result.skippedPipelines.push({
            pipelineDefinitionId: pipeline.id,
            pipelineName: pipeline.name,
            reason: `Branch mismatch: pushed='${event.branch}' trigger='${triggerBranch}'`,
          });
          continue;
        }

        const latestVersion = pipeline.versions[0];
        if (!latestVersion) {
          this.logger.warn(`Pipeline '${pipeline.name}' has no versions — skipping`);
          result.skippedPipelines.push({
            pipelineDefinitionId: pipeline.id,
            pipelineName: pipeline.name,
            reason: 'No pipeline version found',
          });
          continue;
        }

        // ── Step 4: Create PipelineRun + PipelineJob records ───────────────
        try {
          const run = await this.createRunWithJobs(
            pipeline.id,
            latestVersion.id,
            connection.project.organizationId,
            event,
            latestVersion.yamlConfig,
          );

          // ── Step 5: Enqueue to BullMQ worker ───────────────────────────
          await this.pipelineQueue.add(
            PIPELINE_RUN_JOB_NAME,
            {
              pipelineRunId: run.id,
              repoUrl: event.repositoryUrl,
              commitSha: event.commitSha,
              branch: event.branch,
            },
            {
              jobId: `webhook_${run.id}`,
              removeOnComplete: true,
              removeOnFail: false,
            },
          );

          // ── Step 6: Publish domain event ────────────────────────────────
          await this.eventBus.publish({
            eventId: `evt_${Date.now()}`,
            eventName: 'pipeline.run_queued.v1',
            aggregateId: run.id,
            aggregateType: 'PipelineRun',
            occurredOn: new Date(),
            version: 1,
            payload: {
              pipelineRunId: run.id,
              pipelineDefinitionId: pipeline.id,
              pipelineVersionId: latestVersion.id,
              triggerType: TriggerType.GIT_PUSH,
              triggeredBy: event.pusher,
              commitSha: event.commitSha,
              branch: event.branch,
              repositoryUrl: event.repositoryUrl,
            },
          });

          this.logger.log(
            `✓ PipelineRun '${run.id}' created and enqueued for pipeline '${pipeline.name}' (org: ${connection.project.organizationId})`,
          );

          result.triggeredRuns.push({
            pipelineDefinitionId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineRunId: run.id,
            organizationId: connection.project.organizationId,
            projectId: connection.projectId,
            branch: event.branch,
            commitSha: event.commitSha,
          });
        } catch (err) {
          this.logger.error(
            `Failed to trigger run for pipeline '${pipeline.name}': ${err instanceof Error ? err.message : String(err)}`,
          );
          result.skippedPipelines.push({
            pipelineDefinitionId: pipeline.id,
            pipelineName: pipeline.name,
            reason: `Run creation failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    this.logger.log(
      `▸ Webhook routing complete: ${result.triggeredRuns.length} run(s) triggered, ${result.skippedPipelines.length} pipeline(s) skipped`,
    );

    return result;
  }

  private async createRunWithJobs(
    pipelineDefinitionId: string,
    pipelineVersionId: string,
    organizationId: string,
    event: WebhookPushEvent,
    yamlConfig?: string,
  ): Promise<PipelineRun> {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.pipelineRun.create({
        data: {
          pipelineDefinitionId,
          pipelineVersionId,
          status: PipelineRunStatus.QUEUED,
          triggerType: TriggerType.GIT_PUSH,
          triggeredBy: event.pusher || 'github-webhook',
          commitSha: event.commitSha,
          branch: event.branch,
          queuedAt: new Date(),
        },
      });

      let jobDefinitions: { name: string; stage: string }[] = [];
      if (yamlConfig) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const yaml = require('js-yaml');
          const parsed = yaml.load(yamlConfig) as Record<string, any>;
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed['stages']) && parsed['stages'].length > 0) {
              for (const stageItem of parsed['stages']) {
                if (typeof stageItem === 'string') {
                  jobDefinitions.push({ name: stageItem, stage: stageItem });
                } else if (stageItem && typeof stageItem === 'object') {
                  const stageName = String(stageItem.name || stageItem.stage || 'stage');
                  if (Array.isArray(stageItem.jobs) && stageItem.jobs.length > 0) {
                    for (const j of stageItem.jobs) {
                      jobDefinitions.push({
                        name: String(j?.name || stageName),
                        stage: stageName,
                      });
                    }
                  } else {
                    jobDefinitions.push({
                      name: String(stageItem.name || stageName),
                      stage: stageName,
                    });
                  }
                }
              }
            } else if (parsed['jobs']) {
              if (Array.isArray(parsed['jobs'])) {
                for (const j of parsed['jobs']) {
                  jobDefinitions.push({
                    name: String(j?.name || 'job'),
                    stage: String(j?.stage || j?.name || 'build'),
                  });
                }
              } else if (typeof parsed['jobs'] === 'object') {
                const keys = Object.keys(parsed['jobs']);
                for (const key of keys) {
                  const j = parsed['jobs'][key];
                  jobDefinitions.push({
                    name: String(j?.name || key),
                    stage: String(j?.stage || key),
                  });
                }
              }
            }
          }
        } catch {
          // fall through
        }
      }

      if (jobDefinitions.length === 0) {
        jobDefinitions = [
          { name: 'Build Source & Assets', stage: 'build' },
          { name: 'Run Unit & Integration Tests', stage: 'test' },
          { name: 'Deploy Artifacts', stage: 'deploy' },
        ];
      }

      for (const stage of jobDefinitions) {
        await tx.pipelineJob.create({
          data: {
            pipelineRunId: run.id,
            name: stage.name,
            stage: stage.stage,
            status: JobStatus.QUEUED,
          },
        });
      }

      return run;
    });
  }
}
