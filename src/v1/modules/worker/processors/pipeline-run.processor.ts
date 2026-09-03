import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../../core/database/prisma.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { StateMachineService } from '../../../../core/worker/state-machine.service';
import { JobExecutorService } from '../services/job-executor.service';
import { PIPELINE_RUN_QUEUE } from '../../../../core/worker/worker.constants';
import { PipelineRunStatus, JobStatus } from '@prisma/client';

import { DeploymentRunnerService } from '../../deployments/services/deployment-runner.service';

import { WorkspaceManagerService } from '../services/workspace-manager.service';

export interface PipelineRunJobPayload {
  pipelineRunId: string;
  repoUrl: string;
  traceparent?: string;
}

@Processor(PIPELINE_RUN_QUEUE)
export class PipelineRunProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(PipelineRunProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly stateMachine: StateMachineService,
    private readonly jobExecutor: JobExecutorService,
    private readonly deploymentRunner: DeploymentRunnerService,
    private readonly workspaceManager: WorkspaceManagerService,
  ) {
    super();
  }

  /**
   * Startup State Reconciliation & Recovery (Recovery Rule):
   * Reconciles orphaned pipeline runs left in RUNNING status when the worker process restarts.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('▸ Running worker startup state reconciliation & crash recovery scan...');
    try {
      const orphanedRuns = await this.prisma.pipelineRun.findMany({
        where: { status: PipelineRunStatus.RUNNING, deletedAt: null },
      });

      if (orphanedRuns.length === 0) {
        this.logger.log('✓ No orphaned pipeline runs detected on startup.');
        return;
      }

      this.logger.warn(
        `⚠️ Detected ${orphanedRuns.length} orphaned RUNNING pipeline runs from prior process restart.`,
      );

      for (const run of orphanedRuns) {
        const finishedAt = new Date();
        const durationSeconds = run.startedAt
          ? Math.round((finishedAt.getTime() - run.startedAt.getTime()) / 1000)
          : 0;

        await this.prisma.pipelineRun.update({
          where: { id: run.id },
          data: {
            status: PipelineRunStatus.FAILED,
            finishedAt,
            durationSeconds,
          },
        });

        // Clean up orphaned workspace directories
        await this.workspaceManager.cleanupWorkspace(run.id);

        this.logger.log(
          `✓ Reconciled orphaned run '${run.id}': Status marked FAILED (Worker Crash Recovery) & Workspace Purged.`,
        );
      }
    } catch (err) {
      this.logger.error(`Worker startup reconciliation warning: ${(err as Error).message}`);
    }
  }

  async process(job: Job<PipelineRunJobPayload>): Promise<void> {
    const { pipelineRunId, repoUrl } = job.data;

    this.logger.log(`Processing pipeline run: ${pipelineRunId} · repo: ${repoUrl}`);

    const run = await this.prisma.pipelineRun.findFirst({
      where: { id: pipelineRunId, deletedAt: null },
      include: {
        jobs: { orderBy: { createdAt: 'asc' } },
        pipelineVersion: true,
      },
    });

    if (!run) {
      this.logger.warn(`Pipeline run '${pipelineRunId}' not found. Skipping.`);
      return;
    }

    if (this.stateMachine.isTerminalRunStatus(run.status)) {
      this.logger.warn(
        `Pipeline run '${pipelineRunId}' is already in terminal state '${run.status}'. Skipping.`,
      );
      return;
    }

    // Transition: QUEUED → RUNNING
    this.stateMachine.assertValidRunTransition(run.status, PipelineRunStatus.RUNNING);
    const startedAt = new Date();

    await this.prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineRunStatus.RUNNING, startedAt },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.run_started.v1',
      aggregateId: pipelineRunId,
      aggregateType: 'PipelineRun',
      occurredOn: new Date(),
      version: 1,
      payload: { pipelineRunId, startedAt },
    });

    try {
      // Execute jobs in stage order; jobs in same stage could run in parallel (future enhancement)
      const stages = [...new Set(run.jobs.map((j) => j.stage))];

      for (const stage of stages) {
        const stageJobs = run.jobs.filter(
          (j) => j.stage === stage && j.status !== JobStatus.SUCCESS,
        );
        if (stageJobs.length === 0) continue;

        const results = await Promise.all(
          stageJobs.map((j) =>
            run.pipelineVersion?.yamlConfig
              ? this.jobExecutor.executeJob(j, repoUrl, run.pipelineVersion.yamlConfig)
              : this.jobExecutor.executeJob(j, repoUrl),
          ),
        );

        const anyFailed = results.some((j) => j.status === JobStatus.FAILED);
        if (anyFailed) {
          // Mark remaining unstarted jobs in downstream stages as SKIPPED
          await this.prisma.pipelineJob.updateMany({
            where: {
              pipelineRunId,
              status: JobStatus.QUEUED,
            },
            data: { status: JobStatus.SKIPPED },
          });
          throw new Error(`Stage '${stage}' had one or more failed jobs`);
        }
      }

      // Transition: RUNNING → SUCCESS
      const finishedAt = new Date();
      const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);

      this.stateMachine.assertValidRunTransition(
        PipelineRunStatus.RUNNING,
        PipelineRunStatus.SUCCESS,
      );

      await this.prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: { status: PipelineRunStatus.SUCCESS, finishedAt, durationSeconds },
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'pipeline.run_completed.v1',
        aggregateId: pipelineRunId,
        aggregateType: 'PipelineRun',
        occurredOn: new Date(),
        version: 1,
        payload: { pipelineRunId, durationSeconds, finishedAt },
      });

      this.logger.log(
        `✓ Pipeline run '${pipelineRunId}' completed successfully in ${durationSeconds}s`,
      );

      // Trigger automated deployment for successful build run
      await this.triggerAutoDeployment(pipelineRunId);
    } catch (err) {
      const finishedAt = new Date();
      const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);

      this.logger.error(`Pipeline run '${pipelineRunId}' failed: ${(err as Error).message}`);

      // Mark remaining unstarted jobs in downstream stages as SKIPPED
      await this.prisma.pipelineJob.updateMany({
        where: {
          pipelineRunId,
          status: JobStatus.QUEUED,
        },
        data: { status: JobStatus.SKIPPED },
      });

      await this.prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: { status: PipelineRunStatus.FAILED, finishedAt, durationSeconds },
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'pipeline.run_failed.v1',
        aggregateId: pipelineRunId,
        aggregateType: 'PipelineRun',
        occurredOn: new Date(),
        version: 1,
        payload: {
          pipelineRunId,
          status: PipelineRunStatus.FAILED,
          reason: (err as Error).message,
        },
      });
    } finally {
      // Reclaim ephemeral workspace resources post-execution
      await this.workspaceManager.cleanupWorkspace(pipelineRunId);
    }
  }

  /**
   * Automatically provisions target environment and executes deployment runner
   * upon successful build completion.
   */
  private async triggerAutoDeployment(pipelineRunId: string): Promise<void> {
    try {
      const run = await this.prisma.pipelineRun.findUnique({
        where: { id: pipelineRunId },
        include: { pipelineDefinition: true },
      });

      if (!run) return;

      // Find or create target environment
      let env = await this.prisma.environment.findFirst({
        where: { projectId: run.pipelineDefinition.projectId, slug: 'staging', deletedAt: null },
      });

      if (!env) {
        env = await this.prisma.environment.create({
          data: {
            projectId: run.pipelineDefinition.projectId,
            name: 'Staging Environment',
            slug: 'staging',
            type: 'STAGING',
          },
        });
      }

      const deployment = await this.prisma.deployment.create({
        data: {
          environmentId: env.id,
          pipelineRunId,
          status: 'IN_PROGRESS',
          releaseVersion: `v1.0.${Date.now().toString().slice(-4)}`,
          deployedByUserId: run.triggeredBy || 'system_auto_deployer',
          startedAt: new Date(),
        },
      });

      this.logger.log(
        `▸ Triggering auto-deployment for Run '${pipelineRunId}' → Environment '${env.name}' (Deployment ID: ${deployment.id})`,
      );

      if (this.deploymentRunner) {
        await this.deploymentRunner.executeDeployment(deployment.id);
      }
    } catch (err) {
      this.logger.warn(`Auto-deployment warning: ${(err as Error).message}`);
    }
  }
}
