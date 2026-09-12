import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { LogsService } from '../log-streaming/logs.service';
import { PipelineJob, JobStatus, LogLevel, PipelineRunStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────
//  Demo stage → log messages (deterministic, labeled)
// ─────────────────────────────────────────────────────────
const DEMO_STAGE_LOGS: Record<string, string[]> = {
  'git-source': [
    'DEMO MODE: Loading bundled demo application source.',
    'DEMO MODE: Demo source workspace prepared.',
    'DEMO MODE: Source checkout complete (no real repository was accessed).',
  ],
  'checkout-source': [
    'DEMO MODE: Loading bundled demo application source.',
    'DEMO MODE: Demo source workspace prepared.',
  ],
  'dependency-installation': [
    'DEMO MODE: Installing declared demo dependencies.',
    'DEMO MODE: Resolved 312 packages from demo lockfile.',
    'DEMO MODE: Dependency installation completed.',
  ],
  'install-dependencies': [
    'DEMO MODE: Running npm ci on demo lockfile.',
    'DEMO MODE: 312 packages installed in 3.2s.',
  ],
  'application-build': [
    'DEMO MODE: Running simulated application build.',
    'DEMO MODE: Compiling TypeScript source (12 files).',
    'DEMO MODE: Bundle generated — 1.2 MB output.',
    'DEMO MODE: Build completed successfully.',
  ],
  'build-application': ['DEMO MODE: Running npm run build.', 'DEMO MODE: Build output ready.'],
  'automated-tests': [
    'DEMO MODE: Running bundled demo test suite.',
    'DEMO MODE: ✓ 24 tests passed.',
    'DEMO MODE: ✓ 0 tests failed.',
    'DEMO MODE: Coverage: 87%.',
  ],
  'test-suite': ['DEMO MODE: Executing test suite.', 'DEMO MODE: 24/24 passing.'],
  'security-scan': [
    'DEMO MODE: Running simulated security analysis.',
    'DEMO MODE: Scanning filesystem for vulnerabilities (Trivy-style).',
    'DEMO MODE: No blocking HIGH or CRITICAL findings in demo scan.',
    'DEMO MODE: 2 LOW severity informational notices (non-blocking).',
  ],
  'security-audit': [
    'DEMO MODE: Trivy filesystem scan complete.',
    'DEMO MODE: No blocking findings.',
  ],
  'package-artifact': [
    'DEMO MODE: Creating demo artifact.',
    'DEMO MODE: Packaging build output into tar.gz.',
    'DEMO MODE: Artifact created successfully.',
    'DEMO MODE: SHA-256 checksum computed.',
  ],
  'create-artifact': ['DEMO MODE: Artifact package created.', 'DEMO MODE: Available for download.'],
  'deploy-demo-staging': [
    'DEMO MODE: Deploying to simulated demo-staging environment.',
    'DEMO MODE: No external infrastructure was contacted.',
    'DEMO MODE: Simulated deployment complete — status: SUCCESS.',
  ],
  'deploy-staging': [
    'DEMO MODE: Simulated deployment initiated.',
    'DEMO MODE: Target: demo-cluster / demo-staging.',
    'DEMO MODE: Deployment completed. No real cluster was contacted.',
  ],
  'health-check': [
    'DEMO MODE: Simulated health endpoint returned HTTP 200.',
    'DEMO MODE: Application healthy.',
    'DEMO MODE: Deployment complete.',
  ],
  'verify-staging': [
    'DEMO MODE: Health check passed (HTTP 200 simulated).',
    'DEMO MODE: All checks green.',
  ],
};

function getDemoLogs(stageName: string): string[] {
  const key = stageName.toLowerCase().replace(/\s+/g, '-');
  return (
    DEMO_STAGE_LOGS[key] || [
      `DEMO MODE: Executing simulated step '${stageName}'.`,
      `DEMO MODE: Step '${stageName}' completed successfully.`,
    ]
  );
}

@Injectable()
export class DemoRunnerService {
  private readonly logger = new Logger(DemoRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly stateMachine: StateMachineService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Execute a single pipeline job in DEMO MODE.
   * - Emits real logs through the existing SSE system
   * - Persists real PipelineJob DB records
   * - Does NOT touch Docker, kubectl, git, or any real infrastructure
   */
  async executeDemoJob(job: PipelineJob): Promise<PipelineJob> {
    this.logger.log(`[DEMO] Starting demo job '${job.name}' (stage: ${job.stage})`);

    this.stateMachine.assertValidJobTransition(job.status, JobStatus.RUNNING);
    const startedAt = new Date();

    await this.prisma.pipelineJob.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING, startedAt },
    });

    await this.eventBus.publish({
      eventId: `evt_demo_${Date.now()}`,
      eventName: 'pipeline.job_started.v1',
      aggregateId: job.id,
      aggregateType: 'PipelineJob',
      occurredOn: new Date(),
      version: 1,
      payload: { jobId: job.id, pipelineRunId: job.pipelineRunId, name: job.name, demo: true },
    });

    // Simulate realistic execution delay
    const simulatedDurationMs = 1500 + Math.floor(Math.random() * 2000);

    try {
      // Emit demo logs through the real SSE log system
      const logs = getDemoLogs(job.stage || job.name);
      const logDelay = Math.floor(simulatedDurationMs / Math.max(logs.length, 1));

      for (const logLine of logs) {
        await this.delay(logDelay);
        await this.logsService.logAndEmit(job.pipelineRunId, LogLevel.INFO, logLine, job.id);
      }

      // For artifact stage: create a real downloadable demo artifact
      const isArtifactStage =
        job.stage.includes('artifact') ||
        job.stage.includes('package') ||
        job.name.includes('artifact') ||
        job.name.includes('package');

      if (isArtifactStage) {
        await this.createDemoArtifact(job.pipelineRunId, job.id);
      }

      const finishedAt = new Date();
      const durationSeconds = Math.ceil((finishedAt.getTime() - startedAt.getTime()) / 1000);

      this.stateMachine.assertValidJobTransition(JobStatus.RUNNING, JobStatus.SUCCESS);

      const completed = await this.prisma.pipelineJob.update({
        where: { id: job.id },
        data: { status: JobStatus.SUCCESS, finishedAt, durationSeconds },
      });

      await this.logsService.logAndEmit(
        job.pipelineRunId,
        LogLevel.INFO,
        `✓ DEMO MODE: Job '${job.name}' completed in ${durationSeconds}s — Simulated Demo Environment`,
        job.id,
      );

      await this.eventBus.publish({
        eventId: `evt_demo_${Date.now()}`,
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
          demo: true,
        },
      });

      return completed;
    } catch (err) {
      const finishedAt = new Date();
      const durationSeconds = Math.ceil((finishedAt.getTime() - startedAt.getTime()) / 1000);

      this.stateMachine.assertValidJobTransition(JobStatus.RUNNING, JobStatus.FAILED);

      await this.prisma.pipelineJob.update({
        where: { id: job.id },
        data: { status: JobStatus.FAILED, finishedAt, durationSeconds },
      });

      const errMsg = (err as Error).message;
      await this.logsService.logAndEmit(
        job.pipelineRunId,
        LogLevel.ERROR,
        `DEMO MODE: Job '${job.name}' failed: ${errMsg}`,
        job.id,
      );

      throw err;
    }
  }

  /**
   * Complete a full demo pipeline run — marks it SUCCESS after all jobs pass.
   */
  async finalizeDemoRun(pipelineRunId: string): Promise<void> {
    await this.prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        status: PipelineRunStatus.SUCCESS,
        finishedAt: new Date(),
      },
    });

    await this.logsService.logAndEmit(
      pipelineRunId,
      LogLevel.INFO,
      '✓ DEMO MODE: All pipeline stages completed — Simulated Demo Environment — SUCCESS',
    );

    await this.eventBus.publish({
      eventId: `evt_demo_${Date.now()}`,
      eventName: 'pipeline.run_completed.v1',
      aggregateId: pipelineRunId,
      aggregateType: 'PipelineRun',
      occurredOn: new Date(),
      version: 1,
      payload: { pipelineRunId, status: PipelineRunStatus.SUCCESS, demo: true },
    });
  }

  /**
   * Create a real, downloadable demo artifact so the artifact UI works end-to-end.
   */
  private async createDemoArtifact(pipelineRunId: string, jobId: string): Promise<void> {
    try {
      const artifactsDir =
        process.env.ARTIFACTS_BASE_DIR ||
        (fs.existsSync('/opspilot-artifacts')
          ? '/opspilot-artifacts'
          : path.join(os.tmpdir(), 'opspilot-artifacts'));

      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      const archiveFileName = `demo-artifact-${pipelineRunId}.tar.gz`;
      const archivePath = path.join(artifactsDir, archiveFileName);

      if (!fs.existsSync(archivePath)) {
        // Write a real demo manifest file and tar it
        const tmpDir = path.join(os.tmpdir(), `demo-build-${pipelineRunId}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        const manifest = JSON.stringify(
          {
            mode: 'DEMO MODE — Simulated Demo Environment',
            name: 'demo-ecommerce-app',
            version: '1.0.0',
            description: 'Demo artifact — simulated. Not a real build output.',
            stages: [
              'checkout-source',
              'install-dependencies',
              'build-application',
              'test-suite',
              'security-audit',
            ],
            build: {
              tool: 'npm',
              command: 'npm run build',
              runtime: 'Node.js 20',
            },
            generatedAt: new Date().toISOString(),
            disclaimer:
              'This is a controlled demo artifact generated by the OpsPilot Demo Runner. No real build was performed.',
          },
          null,
          2,
        );

        fs.writeFileSync(path.join(tmpDir, 'DEMO_MANIFEST.json'), manifest);
        fs.writeFileSync(
          path.join(tmpDir, 'README.md'),
          `# Demo Build Artifact\n\n**DEMO MODE — Simulated Demo Environment**\n\nThis artifact was generated by the OpsPilot Demo Runner for presentation purposes.\nNo real code was compiled. No real infrastructure was contacted.\n`,
        );

        // Create tar.gz on platforms that support it; fallback to JSON file
        try {
          const { execSync } = await import('child_process');
          execSync(`tar -czf "${archivePath}" -C "${tmpDir}" .`, { stdio: 'pipe' });
        } catch {
          // Fallback: write the manifest directly as the artifact file
          fs.writeFileSync(archivePath, manifest);
        }

        // Cleanup temp dir
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          /* ignore cleanup errors */
        }
      }

      const fileBuffer = fs.readFileSync(archivePath);
      const sizeBytes = BigInt(fileBuffer.length);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check if artifact already registered for this run
      const existing = await this.prisma.artifact.findFirst({
        where: { pipelineRunId },
      });

      if (!existing) {
        await this.prisma.artifact.create({
          data: {
            pipelineRunId,
            name: `demo-ecommerce-app-${pipelineRunId.slice(0, 8)}`,
            version: '1.0.0',
            checksum,
            storageLocation: archivePath,
            sizeBytes,
            status: 'AVAILABLE',
          },
        });

        await this.logsService.logAndEmit(
          pipelineRunId,
          LogLevel.INFO,
          `DEMO MODE: Artifact created — demo-artifact (${sizeBytes} bytes, SHA-256: ${checksum.substring(0, 12)}...) — Demo artifact — simulated`,
          jobId,
        );
      }
    } catch (e) {
      this.logger.error(`[DEMO] Failed to create demo artifact: ${(e as Error).message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
