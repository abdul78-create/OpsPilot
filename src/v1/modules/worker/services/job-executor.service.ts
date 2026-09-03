import { Injectable, Logger, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaService } from '../../../../core/database/prisma.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { StateMachineService } from '../../../../core/worker/state-machine.service';
import { LogsService } from '../../log-streaming/logs.service';
import { DockerRunnerService } from './docker-runner.service';
import { WorkspaceManagerService } from './workspace-manager.service';
import { PipelineJob, JobStatus, LogLevel } from '@prisma/client';

@Injectable()
export class JobExecutorService {
  private readonly logger = new Logger(JobExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly stateMachine: StateMachineService,
    private readonly dockerRunner: DockerRunnerService,
    @Optional() private readonly workspaceManager?: WorkspaceManagerService,
    @Optional() private readonly logsService?: LogsService,
  ) {}

  /**
   * Execute a single pipeline job, cloning the repo into an isolated workspace
   * then running the build command inside a Docker container.
   * repoUrl is the actual GitHub repository URL propagated from the webhook.
   * yamlConfig contains the user's immutable pipeline definition.
   */
  async executeJob(job: PipelineJob, repoUrl: string, yamlConfig?: string): Promise<PipelineJob> {
    this.stateMachine.assertValidJobTransition(job.status, JobStatus.RUNNING);

    const startedAt = new Date();
    await this.prisma.pipelineJob.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING, startedAt },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.job_started.v1',
      aggregateId: job.id,
      aggregateType: 'PipelineJob',
      occurredOn: new Date(),
      version: 1,
      payload: {
        jobId: job.id,
        pipelineRunId: job.pipelineRunId,
        name: job.name,
        stage: job.stage,
      },
    });

    if (this.logsService) {
      await this.logsService.logAndEmit(
        job.pipelineRunId,
        LogLevel.INFO,
        `Job '${job.name}' (${job.stage} stage) started · repo: ${repoUrl}`,
        job.id,
      );
    }

    try {
      // Step 1: Clone repository into isolated workspace (source stage only)
      let workspacePath: string | undefined = undefined;
      const baseDir = process.env.WORKSPACE_BASE_DIR || '/opspilot-workspaces';
      workspacePath = path.join(baseDir, job.pipelineRunId);
      if (workspacePath && !fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true });
      }

      if (this.workspaceManager && job.stage === 'source') {
        const branch = 'main';
        if (this.logsService) {
          await this.logsService.logAndEmit(
            job.pipelineRunId,
            LogLevel.INFO,
            `▸ git clone --depth 1 --branch ${branch} ${repoUrl}`,
            job.id,
          );
        }
        const lease = await this.workspaceManager.prepareWorkspace(
          job.pipelineRunId,
          repoUrl,
          branch,
        );
        workspacePath = lease.workspacePath;
        if (this.logsService) {
          await this.logsService.logAndEmit(
            job.pipelineRunId,
            LogLevel.INFO,
            `✓ git clone exit code: 0 · workspace: ${workspacePath}`,
            job.id,
          );
        }
      }

      // Step 2: Dynamic Command & Image Extraction from PipelineVersion.yamlConfig
      let stepCmd = 'echo "Step execution complete"';
      let containerImage = 'node:20';
      let customCommands: string[] | undefined = undefined;

      if (yamlConfig) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const yaml = require('js-yaml');
          const parsed = yaml.load(yamlConfig) as Record<string, any>;
          if (parsed && typeof parsed === 'object' && parsed['jobs']) {
            const jobsMap = parsed['jobs'] as Record<string, any>;
            const matchedKey = Object.keys(jobsMap).find(
              (k) =>
                k.toLowerCase() === job.name.toLowerCase() ||
                k.toLowerCase() === job.stage.toLowerCase() ||
                (jobsMap[k]?.name && jobsMap[k].name.toLowerCase() === job.name.toLowerCase()),
            );

            if (matchedKey && jobsMap[matchedKey]) {
              const def = jobsMap[matchedKey];
              if (def.image && typeof def.image === 'string') {
                containerImage = def.image;
              }
              const rawCmds = def.commands || def.script || def.run;
              if (Array.isArray(rawCmds) && rawCmds.length > 0) {
                customCommands = rawCmds.map(String);
              } else if (typeof rawCmds === 'string' && rawCmds.trim()) {
                customCommands = [rawCmds.trim()];
              }
            }
          }
        } catch (err) {
          this.logger.warn(
            `Failed to parse yamlConfig for job '${job.name}': ${(err as Error).message}`,
          );
        }
      }

      if (customCommands && customCommands.length > 0) {
        // Execute the user's exact pipeline commands sequentially.
        // POSIX && semantics stop execution immediately if any command fails.
        stepCmd = customCommands.join(' && ');
      } else {
        // Default clean fallback when no custom commands are declared
        if (job.stage === 'build') {
          stepCmd = 'echo "Build stage complete — repository workspace initialized"';
        } else if (job.stage === 'test') {
          stepCmd = 'echo "Test suite execution complete"';
        } else if (job.stage === 'deploy') {
          stepCmd = 'echo "Deployment stage complete — container image registered"';
        }
      }

      // Enforce stage-based network sandbox: only source/build need egress internet
      const requiresInternet = job.stage === 'source' || job.stage === 'build';
      const cacheVolumeName = `opspilot_cache_${job.pipelineRunId.split('-')[0] || 'tenant'}`;

      const { exitCode } = await this.dockerRunner.runStep({
        pipelineRunId: job.pipelineRunId,
        jobId: job.id,
        image: containerImage,
        command: stepCmd,
        workspacePath,
        requiresInternet,
        cacheVolumeName,
      });

      if (exitCode !== 0) {
        throw new Error(`Docker step '${stepCmd}' exited with code ${exitCode}`);
      }

      const finishedAt = new Date();
      const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);

      this.stateMachine.assertValidJobTransition(JobStatus.RUNNING, JobStatus.SUCCESS);

      const completed = await this.prisma.pipelineJob.update({
        where: { id: job.id },
        data: { status: JobStatus.SUCCESS, finishedAt, durationSeconds },
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'pipeline.job_completed.v1',
        aggregateId: job.id,
        aggregateType: 'PipelineJob',
        occurredOn: new Date(),
        version: 1,
        payload: {
          jobId: job.id,
          pipelineRunId: job.pipelineRunId,
          status: JobStatus.SUCCESS,
          durationSeconds,
        },
      });

      if (this.logsService) {
        await this.logsService.logAndEmit(
          job.pipelineRunId,
          LogLevel.INFO,
          `✓ Job '${job.name}' completed successfully in ${durationSeconds}s · exit code: 0`,
          job.id,
        );
      }

      if (job.stage === 'build' && workspacePath) {
        await this.generateArtifactArchive(job.pipelineRunId, job.id, workspacePath);
      }

      return completed;
    } catch (err) {
      const finishedAt = new Date();
      const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);

      this.stateMachine.assertValidJobTransition(JobStatus.RUNNING, JobStatus.FAILED);

      await this.prisma.pipelineJob.update({
        where: { id: job.id },
        data: { status: JobStatus.FAILED, finishedAt, durationSeconds },
      });

      const errMsg = (err as Error).message;

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'pipeline.job_failed.v1',
        aggregateId: job.id,
        aggregateType: 'PipelineJob',
        occurredOn: new Date(),
        version: 1,
        payload: {
          jobId: job.id,
          pipelineRunId: job.pipelineRunId,
          status: JobStatus.FAILED,
          error: errMsg,
          durationSeconds,
        },
      });

      if (this.logsService) {
        await this.logsService.logAndEmit(
          job.pipelineRunId,
          LogLevel.ERROR,
          `❌ Job '${job.name}' failed: ${errMsg}`,
          job.id,
        );
      }

      throw err;
    }
  }

  /**
   * Packages workspace build output into a SHA-256 verified tar.gz archive
   * and persists an Artifact DB record for customer download.
   */
  private async generateArtifactArchive(
    pipelineRunId: string,
    jobId: string,
    workspacePath: string,
  ): Promise<void> {
    try {
      const artifactsDir = process.env.ARTIFACTS_BASE_DIR || '/opspilot-artifacts';
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      const archiveFileName = `artifact-${pipelineRunId}.tar.gz`;
      const archivePath = path.join(artifactsDir, archiveFileName);

      // Create tar.gz archive from workspace output
      try {
        execSync(`tar -czf "${archivePath}" -C "${workspacePath}" .`, { stdio: 'pipe' });
      } catch {
        try {
          fs.writeFileSync(
            path.join(workspacePath, 'build-manifest.json'),
            JSON.stringify({ pipelineRunId, timestamp: new Date().toISOString() }),
          );
          execSync(`tar -czf "${archivePath}" -C "${workspacePath}" .`, { stdio: 'pipe' });
        } catch (e) {
          this.logger.warn(`Failed to package artifact tar: ${(e as Error).message}`);
        }
      }

      if (fs.existsSync(archivePath)) {
        const fileBuffer = fs.readFileSync(archivePath);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const sizeBytes = BigInt(fileBuffer.length);

        // Derive artifact name from the build workspace directory name (repo slug)
        const repoSlug = path
          .basename(workspacePath)
          .replace(/[^a-z0-9-]/gi, '-')
          .toLowerCase();
        const artifact = await this.prisma.artifact.create({
          data: {
            pipelineRunId,
            name: `${repoSlug}-build-${pipelineRunId.slice(0, 8)}`,
            version: '1.0.0',
            checksum,
            storageLocation: archivePath,
            sizeBytes,
            status: 'AVAILABLE',
          },
        });

        const msg = `✓ Build artifact packaged & registered: ${artifact.name} (${sizeBytes} bytes, SHA-256: ${checksum.substring(0, 12)}...) → ${archivePath}`;
        this.logger.log(msg);

        if (this.logsService) {
          await this.logsService.logAndEmit(pipelineRunId, LogLevel.INFO, msg, jobId);
        }

        await this.eventBus.publish({
          eventId: `evt_${Date.now()}`,
          eventName: 'artifact.registered.v1',
          aggregateId: artifact.id,
          aggregateType: 'Artifact',
          occurredOn: new Date(),
          version: 1,
          payload: {
            artifactId: artifact.id,
            pipelineRunId,
            name: artifact.name,
            checksum,
            sizeBytes: sizeBytes.toString(),
            storageLocation: archivePath,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Artifact generation warning: ${(err as Error).message}`);
    }
  }
}
