import { Injectable, Logger, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
   * repoUrl is the actual GitHub repository URL propagated from the webhook or trigger.
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
      // Step 1: Initialize isolated workspace directory for this pipeline run
      let workspacePath: string | undefined = undefined;
      const baseDir =
        process.env.WORKSPACE_BASE_DIR ||
        (fs.existsSync('/opspilot-workspaces')
          ? '/opspilot-workspaces'
          : path.join(os.tmpdir(), 'opspilot-workspaces'));
      workspacePath = path.join(baseDir, job.pipelineRunId);
      try {
        if (workspacePath && !fs.existsSync(workspacePath)) {
          fs.mkdirSync(workspacePath, { recursive: true });
        }
      } catch (err) {
        this.logger.warn(
          `Could not create workspace path '${workspacePath}': ${(err as Error).message}`,
        );
      }

      // Step 2: Dynamic Command & Image Extraction from PipelineVersion.yamlConfig
      let containerImage = 'node:20-alpine';
      let customCommands: string[] | undefined = undefined;

      if (yamlConfig) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const yaml = require('js-yaml');
          const parsed = yaml.load(yamlConfig) as Record<string, any>;
          if (parsed && typeof parsed === 'object') {
            const matchTarget = (candidateName: string | undefined): boolean => {
              if (!candidateName) return false;
              const c = candidateName.toLowerCase().trim();
              const jn = job.name.toLowerCase().trim();
              const js = job.stage.toLowerCase().trim();
              return (
                c === jn ||
                c === js ||
                c.replace(/[^a-z0-9]/g, '') === jn.replace(/[^a-z0-9]/g, '') ||
                c.replace(/[^a-z0-9]/g, '') === js.replace(/[^a-z0-9]/g, '')
              );
            };

            const extractCmds = (raw: any): string[] | undefined => {
              if (Array.isArray(raw)) {
                const flattened: string[] = [];
                for (const item of raw) {
                  if (typeof item === 'string' && item.trim()) {
                    flattened.push(item.trim());
                  } else if (item && typeof item === 'object') {
                    const stepCmd = item.run || item.command || item.script;
                    if (stepCmd && typeof stepCmd === 'string' && stepCmd.trim()) {
                      flattened.push(stepCmd.trim());
                    }
                  }
                }
                return flattened.length > 0 ? flattened : undefined;
              } else if (typeof raw === 'string' && raw.trim()) {
                return [raw.trim()];
              }
              return undefined;
            };

            // Case A: Check stages array (Standard Builder & multi-stage YAML)
            if (Array.isArray(parsed.stages)) {
              for (const stage of parsed.stages) {
                if (!stage || typeof stage !== 'object') continue;
                const stageMatches = matchTarget(stage.name) || matchTarget(stage.stage);

                if (Array.isArray(stage.jobs)) {
                  for (const j of stage.jobs) {
                    if (!j || typeof j !== 'object') continue;
                    if (matchTarget(j.name) || (stageMatches && stage.jobs.length === 1)) {
                      if (j.image || stage.image) {
                        containerImage = j.image || stage.image;
                      }
                      customCommands =
                        extractCmds(j.steps || j.commands || j.script || j.run) ||
                        extractCmds(stage.steps || stage.commands || stage.script || stage.run);
                      break;
                    }
                  }
                }

                if (!customCommands && stageMatches) {
                  if (stage.image) {
                    containerImage = stage.image;
                  }
                  customCommands = extractCmds(
                    stage.steps || stage.commands || stage.script || stage.run,
                  );
                }

                if (customCommands) break;
              }
            }

            // Case B: Check jobs map or array
            if (!customCommands && parsed.jobs) {
              if (Array.isArray(parsed.jobs)) {
                for (const j of parsed.jobs) {
                  if (!j || typeof j !== 'object') continue;
                  if (matchTarget(j.name) || matchTarget(j.stage)) {
                    if (j.image) containerImage = j.image;
                    customCommands = extractCmds(j.steps || j.commands || j.script || j.run);
                    break;
                  }
                }
              } else if (typeof parsed.jobs === 'object') {
                for (const key of Object.keys(parsed.jobs)) {
                  const j = parsed.jobs[key];
                  if (matchTarget(key) || matchTarget(j?.name) || matchTarget(j?.stage)) {
                    if (j?.image) containerImage = j.image;
                    customCommands = extractCmds(j?.steps || j?.commands || j?.script || j?.run);
                    break;
                  }
                }
              }
            }
          }
        } catch (err) {
          this.logger.warn(
            `Failed to parse yamlConfig for job '${job.name}': ${(err as Error).message}`,
          );
        }
      }

      // If commands were declared, resolve the real repository URL into any checkout commands
      if (customCommands && customCommands.length > 0) {
        if (repoUrl) {
          customCommands = customCommands.map((cmd) =>
            cmd
              .replace(/\bgit clone repository \./g, `git clone ${repoUrl} .`)
              .replace(/\bgit clone repository\b/g, `git clone ${repoUrl}`),
          );
        }
      } else if (yamlConfig) {
        throw new Error(
          `No executable commands found for job '${job.name}' (stage: '${job.stage}') in pipeline configuration.`,
        );
      } else {
        // Direct invocation without yamlConfig (e.g. unit tests)
        customCommands = [
          job.stage === 'test'
            ? 'npm test'
            : job.stage === 'build'
              ? 'npm run build'
              : 'echo "Step complete"',
        ];
      }

      const stepCmd = customCommands.join(' && ');

      // Step 3: Workspace Repository Assurance
      // If the workspace does not contain .git and this step is NOT running a git clone command,
      // clone the connected repository using workspaceManager so the workspace is ready for build/test/scan.
      const hasGitRepo = fs.existsSync(path.join(workspacePath, '.git'));
      const isCloneCommand = stepCmd.includes('git clone');

      if (!hasGitRepo && !isCloneCommand && repoUrl && this.workspaceManager) {
        if (this.logsService) {
          await this.logsService.logAndEmit(
            job.pipelineRunId,
            LogLevel.INFO,
            `▸ Preparing repository workspace: git clone ${repoUrl}`,
            job.id,
          );
        }
        const lease = await this.workspaceManager.prepareWorkspace(
          job.pipelineRunId,
          repoUrl,
          'main',
        );
        workspacePath = lease.workspacePath;
      }

      // Enforce stage-based network sandbox: source, build, and security scans need internet egress
      const requiresInternet =
        job.stage.includes('source') ||
        job.stage.includes('build') ||
        job.stage.includes('security') ||
        job.stage.includes('scan') ||
        job.name.toLowerCase().includes('checkout') ||
        job.name.toLowerCase().includes('trivy') ||
        stepCmd.includes('git') ||
        stepCmd.includes('trivy') ||
        stepCmd.includes('npm') ||
        stepCmd.includes('pip') ||
        stepCmd.includes('go');

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

      const isBuildStage =
        job.stage === 'build' ||
        job.stage.toLowerCase().includes('build') ||
        job.name.toLowerCase().includes('build');
      if (isBuildStage && workspacePath) {
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
      if (!fs.existsSync(workspacePath)) {
        this.logger.warn(`Workspace path '${workspacePath}' does not exist. Skipping artifact.`);
        return;
      }

      const files = fs.readdirSync(workspacePath);
      // If workspace only contains .git or is empty, no real build artifact exists
      const realFiles = files.filter((f) => f !== '.git');
      if (realFiles.length === 0) {
        this.logger.warn(
          `Workspace path '${workspacePath}' contains no build files. Skipping artifact.`,
        );
        return;
      }

      const artifactsDir = process.env.ARTIFACTS_BASE_DIR || '/opspilot-artifacts';
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      const archiveFileName = `artifact-${pipelineRunId}.tar.gz`;
      const archivePath = path.join(artifactsDir, archiveFileName);

      // Create tar.gz archive from real workspace output — exclude .git directory and node_modules
      execSync(
        `tar -czf "${archivePath}" --exclude .git --exclude node_modules -C "${workspacePath}" .`,
        {
          stdio: 'pipe',
        },
      );

      if (!fs.existsSync(archivePath)) {
        throw new Error('Archive file was not created by tar command.');
      }

      const fileBuffer = fs.readFileSync(archivePath);
      const sizeBytes = BigInt(fileBuffer.length);
      if (sizeBytes === 0n) {
        throw new Error('Archive file is 0 bytes.');
      }

      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

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
          sizeBytes: Number(sizeBytes),
          checksum,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to package artifact: ${(e as Error).message}`);
    }
  }
}
