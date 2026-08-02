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
});
