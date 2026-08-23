import { Test, TestingModule } from '@nestjs/testing';
import { PipelineRunProcessor } from './pipeline-run.processor';
import { JobExecutorService } from '../services/job-executor.service';
import { DockerRunnerService } from '../services/docker-runner.service';
import { StateMachineService } from '../../../../core/worker/state-machine.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { PrismaService } from '../../../../core/database/prisma.service';
import { LogsService } from '../../log-streaming/logs.service';
import { DeploymentRunnerService } from '../../deployments/services/deployment-runner.service';
import { WorkspaceManagerService } from '../services/workspace-manager.service';

describe('PipelineRunProcessor & DockerRunner', () => {
  let processor: PipelineRunProcessor;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineRunProcessor,
        JobExecutorService,
        DockerRunnerService,
        StateMachineService,
        {
          provide: LogsService,
          useValue: {
            logAndEmit: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            pipelineRun: {
              findFirst: jest.fn().mockResolvedValue(null),
              update: jest.fn().mockResolvedValue({}),
            },
            pipelineJob: {
              update: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
            },
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: DeploymentRunnerService,
          useValue: {
            executeDeployment: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
          },
        },
        {
          provide: WorkspaceManagerService,
          useValue: {
            prepareWorkspace: jest.fn().mockResolvedValue({ workspacePath: '/tmp' }),
            cleanupWorkspace: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    processor = module.get<PipelineRunProcessor>(PipelineRunProcessor);
  });

  it('should skip processing if pipeline run is not found in database', async () => {
    const jobMock = {
      data: { pipelineRunId: 'non_existent_run' },
    } as any;

    await expect(processor.process(jobMock)).resolves.not.toThrow();
  });

  it('should execute parallel jobs in the same stage and skip downstream jobs on failure', async () => {
    const mockPrisma = (processor as any).prisma;
    const mockExecutor = (processor as any).jobExecutor;

    const runId = 'run_parallel_test_1';
    const mockRun = {
      id: runId,
      status: 'QUEUED',
      jobs: [
        {
          id: 'job_build',
          stage: 'build',
          name: 'compile',
          status: 'QUEUED',
          pipelineRunId: runId,
        },
        { id: 'job_lint', stage: 'build', name: 'lint', status: 'QUEUED', pipelineRunId: runId },
        {
          id: 'job_deploy',
          stage: 'deploy',
          name: 'release',
          status: 'QUEUED',
          pipelineRunId: runId,
        },
      ],
    };

    mockPrisma.pipelineRun.findFirst.mockResolvedValueOnce(mockRun);
    mockPrisma.pipelineJob.updateMany = jest.fn().mockResolvedValue({ count: 1 });

    // Simulate job_build succeeding, but job_lint failing in the parallel 'build' stage
    jest.spyOn(mockExecutor, 'executeJob').mockImplementation(async (job: any) => {
      if (job.id === 'job_lint') {
        return { ...job, status: 'FAILED' };
      }
      return { ...job, status: 'SUCCESS' };
    });

    const jobMock = {
      data: { pipelineRunId: runId, repoUrl: 'https://github.com/org/repo' },
    } as any;

    await processor.process(jobMock);

    // Verify run marked FAILED
    expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: runId },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );

    // Verify downstream queued jobs were updated to SKIPPED
    expect(mockPrisma.pipelineJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pipelineRunId: runId, status: 'QUEUED' },
        data: { status: 'SKIPPED' },
      }),
    );
  });
});
