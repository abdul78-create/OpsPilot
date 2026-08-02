import { Test, TestingModule } from '@nestjs/testing';
import { PipelineRunProcessor } from './processors/pipeline-run.processor';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { JobExecutorService } from './services/job-executor.service';
import { DeploymentRunnerService } from '../deployments/services/deployment-runner.service';
import { WorkspaceManagerService } from './services/workspace-manager.service';
import { PipelineRunStatus } from '@prisma/client';

describe('PipelineRunProcessor Worker Startup Recovery Integration Test', () => {
  let processor: PipelineRunProcessor;

  const mockPrisma = {
    pipelineRun: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventBus = { publish: jest.fn() };
  const mockStateMachine = { isTerminalRunStatus: jest.fn() };
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

  it('should detect orphaned RUNNING pipeline runs on startup and update status to FAILED while purging workspace', async () => {
    const orphanedRunId = 'run_orphaned_123';
    mockPrisma.pipelineRun.findMany.mockResolvedValue([
      {
        id: orphanedRunId,
        status: PipelineRunStatus.RUNNING,
        startedAt: new Date(Date.now() - 30000),
      },
    ]);

    mockPrisma.pipelineRun.update.mockResolvedValue({
      id: orphanedRunId,
      status: PipelineRunStatus.FAILED,
    });

    await processor.onApplicationBootstrap();

    expect(mockPrisma.pipelineRun.findMany).toHaveBeenCalledWith({
      where: { status: PipelineRunStatus.RUNNING, deletedAt: null },
    });

    expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith({
      where: { id: orphanedRunId },
      data: expect.objectContaining({
        status: PipelineRunStatus.FAILED,
      }),
    });

    expect(mockWorkspaceManager.cleanupWorkspace).toHaveBeenCalledWith(orphanedRunId);
  });
});
