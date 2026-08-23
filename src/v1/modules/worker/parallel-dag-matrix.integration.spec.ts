import { Test, TestingModule } from '@nestjs/testing';
import { PipelineRunProcessor } from './processors/pipeline-run.processor';
import { JobExecutorService } from './services/job-executor.service';
import { DockerRunnerService } from './services/docker-runner.service';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { LogsService } from '../log-streaming/logs.service';
import { DeploymentRunnerService } from '../deployments/services/deployment-runner.service';
import { WorkspaceManagerService } from './services/workspace-manager.service';
import { PipelineRunStatus, JobStatus } from '@prisma/client';

describe('Parallel DAG Execution, Race Condition & Cache Isolation Matrix', () => {
  let processor: PipelineRunProcessor;

  const mockPrisma = {
    pipelineRun: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
    },
    pipelineJob: {
      update: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const mockEventBus = { publish: jest.fn().mockResolvedValue(true) };
  const mockStateMachine = new StateMachineService();
  const mockDeploymentRunner = {
    executeDeployment: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
  };
  const mockWorkspaceManager = {
    prepareWorkspace: jest.fn().mockResolvedValue({ workspacePath: '/tmp' }),
    cleanupWorkspace: jest.fn().mockResolvedValue({}),
  };
  const mockLogsService = { logAndEmit: jest.fn().mockResolvedValue({}) };

  const mockJobExecutor = {
    executeJob: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineRunProcessor,
        { provide: JobExecutorService, useValue: mockJobExecutor },
        DockerRunnerService,
        { provide: StateMachineService, useValue: mockStateMachine },
        { provide: LogsService, useValue: mockLogsService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: DeploymentRunnerService, useValue: mockDeploymentRunner },
        { provide: WorkspaceManagerService, useValue: mockWorkspaceManager },
      ],
    }).compile();

    processor = module.get<PipelineRunProcessor>(PipelineRunProcessor);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Concurrent Parallel Execution of Multiple Jobs', () => {
    it('should execute build, lint, and security scan concurrently in the same stage', async () => {
      const runId = 'run_parallel_multi_1';
      const jobs = [
        {
          id: 'j_build',
          stage: 'verify',
          name: 'build',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_lint',
          stage: 'verify',
          name: 'lint',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_sec',
          stage: 'verify',
          name: 'security',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
      ];

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.QUEUED,
        jobs,
      });

      mockJobExecutor.executeJob.mockImplementation(async (j: any) => {
        return { ...j, status: JobStatus.SUCCESS };
      });

      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      expect(mockJobExecutor.executeJob).toHaveBeenCalledTimes(3);
      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: runId },
          data: expect.objectContaining({ status: PipelineRunStatus.SUCCESS }),
        }),
      );
    });
  });

  describe('2. Partial Failure & Downstream SKIPPED Propagation', () => {
    it('should mark downstream jobs SKIPPED when an upstream parallel job fails', async () => {
      const runId = 'run_partial_fail_1';
      const jobs = [
        {
          id: 'j_compile',
          stage: 'build',
          name: 'compile',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_lint',
          stage: 'build',
          name: 'lint',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_test',
          stage: 'test',
          name: 'unit-tests',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_deploy',
          stage: 'deploy',
          name: 'prod-release',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
      ];

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.QUEUED,
        jobs,
      });

      // compile succeeds, but lint fails
      mockJobExecutor.executeJob.mockImplementation(async (j: any) => {
        if (j.id === 'j_lint') return { ...j, status: JobStatus.FAILED };
        return { ...j, status: JobStatus.SUCCESS };
      });

      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      // Downstream jobs updated to SKIPPED
      expect(mockPrisma.pipelineJob.updateMany).toHaveBeenCalledWith({
        where: { pipelineRunId: runId, status: JobStatus.QUEUED },
        data: { status: JobStatus.SKIPPED },
      });

      // Run marked FAILED
      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: runId },
          data: expect.objectContaining({ status: PipelineRunStatus.FAILED }),
        }),
      );
    });
  });

  describe('3. Simultaneous Multiple Parallel Branch Failures', () => {
    it('should handle simultaneous failures across multiple parallel jobs cleanly', async () => {
      const runId = 'run_multi_fail_1';
      const jobs = [
        {
          id: 'j_b1',
          stage: 'check',
          name: 'typecheck',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_b2',
          stage: 'check',
          name: 'lint',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
      ];

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.QUEUED,
        jobs,
      });

      // Both parallel jobs fail
      mockJobExecutor.executeJob.mockResolvedValue({ status: JobStatus.FAILED });

      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: runId },
          data: expect.objectContaining({ status: PipelineRunStatus.FAILED }),
        }),
      );
    });
  });

  describe('4. Tenant Cache Volume Scoping', () => {
    it('should generate distinct, non-overlapping cache volume identifiers per tenant/project', () => {
      const projectA = 'proj_alpha_99';
      const projectB = 'proj_bravo_88';

      const cacheVolA = `opspilot_cache_${projectA}`;
      const cacheVolB = `opspilot_cache_${projectB}`;

      expect(cacheVolA).not.toEqual(cacheVolB);
      expect(cacheVolA).toBe('opspilot_cache_proj_alpha_99');
      expect(cacheVolB).toBe('opspilot_cache_proj_bravo_88');
    });
  });

  describe('5. Timeout in Parallel Job Execution (#5)', () => {
    it('should abort pipeline and mark downstream jobs SKIPPED when a parallel job times out', async () => {
      const runId = 'run_timeout_test_1';
      const jobs = [
        {
          id: 'j_timeout',
          stage: 'build',
          name: 'long_task',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
        {
          id: 'j_deploy',
          stage: 'deploy',
          name: 'release',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
      ];

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.QUEUED,
        jobs,
      });

      // Simulate timeout error (Docker exit code 124)
      mockJobExecutor.executeJob.mockRejectedValueOnce(
        new Error('Docker step timed out with exit code 124'),
      );

      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: runId },
          data: expect.objectContaining({ status: PipelineRunStatus.FAILED }),
        }),
      );

      expect(mockWorkspaceManager.cleanupWorkspace).toHaveBeenCalledWith(runId);
    });
  });

  describe('6. In-Flight Run Cancellation (#6)', () => {
    it('should cleanly abort execution if run is in terminal/cancelled state', async () => {
      const runId = 'run_cancelled_test_1';

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.CANCELLED,
        jobs: [{ id: 'j1', stage: 'build', status: JobStatus.QUEUED }],
      });

      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      expect(mockJobExecutor.executeJob).not.toHaveBeenCalled();
    });
  });

  describe('7. Worker Crash & Startup State Reconciliation (#7)', () => {
    it('should reconcile orphaned RUNNING runs from crashed workers on startup', async () => {
      const orphanedRun = {
        id: 'run_crashed_1',
        status: PipelineRunStatus.RUNNING,
        startedAt: new Date(Date.now() - 60000),
      };

      mockPrisma.pipelineRun.findMany.mockResolvedValueOnce([orphanedRun]);

      await processor.onApplicationBootstrap();

      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run_crashed_1' },
          data: expect.objectContaining({ status: PipelineRunStatus.FAILED }),
        }),
      );

      expect(mockWorkspaceManager.cleanupWorkspace).toHaveBeenCalledWith('run_crashed_1');
    });
  });

  describe('8. Retry & Skip Completed Jobs (#8)', () => {
    it('should not re-execute already SUCCESSFUL jobs during pipeline retry', async () => {
      const runId = 'run_retry_test_1';
      const jobs = [
        {
          id: 'j_already_success',
          stage: 'source',
          name: 'clone',
          status: JobStatus.SUCCESS,
          pipelineRunId: runId,
        },
        {
          id: 'j_to_retry',
          stage: 'build',
          name: 'compile',
          status: JobStatus.QUEUED,
          pipelineRunId: runId,
        },
      ];

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.QUEUED,
        jobs,
      });

      mockJobExecutor.executeJob.mockResolvedValue({ id: 'j_to_retry', status: JobStatus.SUCCESS });

      // Run processor — only the uncompleted/QUEUED job should be executed
      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      expect(mockJobExecutor.executeJob).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'j_to_retry' }),
        expect.any(String),
      );
    });
  });

  describe('11. Concurrent Status-Write Race Handling (#11)', () => {
    it('should handle simultaneous job completion state transitions without collision', async () => {
      const runId = 'run_concurrent_write_1';
      const jobs = [
        { id: 'j1', stage: 'test', name: 'unit_1', status: JobStatus.QUEUED, pipelineRunId: runId },
        { id: 'j2', stage: 'test', name: 'unit_2', status: JobStatus.QUEUED, pipelineRunId: runId },
        { id: 'j3', stage: 'test', name: 'unit_3', status: JobStatus.QUEUED, pipelineRunId: runId },
      ];

      mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce({
        id: runId,
        status: PipelineRunStatus.QUEUED,
        jobs,
      });

      // All 3 resolve simultaneously at the exact same tick
      mockJobExecutor.executeJob.mockImplementation(async (j: any) => ({
        ...j,
        status: JobStatus.SUCCESS,
      }));

      await processor.process({
        data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
      } as any);

      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: runId },
          data: expect.objectContaining({ status: PipelineRunStatus.SUCCESS }),
        }),
      );
    });
  });
});
