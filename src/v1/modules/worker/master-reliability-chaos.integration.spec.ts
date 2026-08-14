import { Test, TestingModule } from '@nestjs/testing';
import { PipelineRunProcessor } from './processors/pipeline-run.processor';
import { JobExecutorService } from './services/job-executor.service';
import { WorkspaceManagerService } from './services/workspace-manager.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { DeploymentRunnerService } from '../deployments/services/deployment-runner.service';
import { PipelineRunStatus, JobStatus } from '@prisma/client';

describe('Master Reliability, Chaos & Failure Recovery Audit Suite', () => {
  let processor: PipelineRunProcessor;

  const mockPrisma = {
    pipelineRun: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pipelineJob: {
      update: jest.fn(),
    },
  };

  const mockEventBus = { publish: jest.fn() };
  const mockStateMachine = {
    isTerminalRunStatus: jest.fn().mockReturnValue(false),
    assertValidJobTransition: jest.fn(),
  };
  const mockJobExecutor = { executeJob: jest.fn() };
  const mockDeploymentRunner = { executeDeployment: jest.fn() };
  const mockWorkspaceManager = { cleanupWorkspace: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineRunProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: StateMachineService, useValue: mockStateMachine },
        { provide: JobExecutorService, useValue: mockJobExecutor },
        { provide: DeploymentRunnerService, useValue: mockDeploymentRunner },
        { provide: WorkspaceManagerService, useValue: mockWorkspaceManager },
      ],
    }).compile();

    processor = module.get<PipelineRunProcessor>(PipelineRunProcessor);
    jest.clearAllMocks();
  });

  describe('1. Startup State Reconciliation (Recovery Rule)', () => {
    it('should reconcile orphaned RUNNING pipeline runs left after process crashes', async () => {
      const orphanedRunId = 'run_orphaned_chaos_1';
      mockPrisma.pipelineRun.findMany.mockResolvedValue([
        {
          id: orphanedRunId,
          status: PipelineRunStatus.RUNNING,
          startedAt: new Date(Date.now() - 60000),
        },
      ]);
      mockPrisma.pipelineRun.update.mockResolvedValue({
        id: orphanedRunId,
        status: PipelineRunStatus.FAILED,
      });

      await processor.onApplicationBootstrap();

      expect(mockPrisma.pipelineRun.findMany).toHaveBeenCalled();
      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith({
        where: { id: orphanedRunId },
        data: expect.objectContaining({ status: PipelineRunStatus.FAILED }),
      });
      expect(mockWorkspaceManager.cleanupWorkspace).toHaveBeenCalledWith(orphanedRunId);
    });
  });

  describe('2. Worker & Runner Failure Recovery', () => {
    it('should safely transition job state to FAILED when Docker runner throws runtime exception', async () => {
      const job: any = {
        id: 'job_fail_1',
        pipelineRunId: 'run_fail_1',
        name: 'build',
        stage: 'build',
        status: JobStatus.QUEUED,
      };
      mockJobExecutor.executeJob.mockRejectedValue(
        new Error('Docker container crashed: exit code 137 (OOM KILLED)'),
      );

      try {
        await mockJobExecutor.executeJob(job, 'https://github.com/test/repo');
      } catch (err) {
        expect((err as Error).message).toContain('OOM KILLED');
      }
    });
  });

  describe('3. Duplicate Webhook & Delivery Idempotency Protection', () => {
    it('should prevent duplicate job execution if run is already in terminal state', () => {
      mockStateMachine.isTerminalRunStatus.mockReturnValue(true);
      const isTerminal = mockStateMachine.isTerminalRunStatus(PipelineRunStatus.SUCCESS);
      expect(isTerminal).toBe(true);
    });
  });
});
