import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentRunnerService } from './services/deployment-runner.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { LogsService } from '../log-streaming/logs.service';
import { DeploymentStatus } from '@prisma/client';

describe('DeploymentRunnerService Mutex Locking Integration Test', () => {
  let service: DeploymentRunnerService;

  const mockPrisma = {
    deployment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockLogsService = {
    appendLog: jest.fn(),
    logAndEmit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentRunnerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: LogsService, useValue: mockLogsService },
      ],
    }).compile();

    service = module.get<DeploymentRunnerService>(DeploymentRunnerService);
    jest.clearAllMocks();
  });

  it('should reject deployment attempt when environment mutex is locked by another IN_PROGRESS deployment', async () => {
    const environmentId = 'env_staging_123';
    const activeDeploymentId = 'dep_active_111';
    const newDeploymentId = 'dep_new_222';

    mockPrisma.deployment.findUnique.mockResolvedValue({
      id: newDeploymentId,
      environmentId,
      pipelineRunId: 'run_999',
      releaseVersion: 'v1.0.1',
      environment: { name: 'Staging Environment' },
      pipelineRun: { artifacts: [] },
    });

    // Mock active deployment holding lock
    mockPrisma.deployment.findFirst.mockResolvedValue({
      id: activeDeploymentId,
      environmentId,
      status: DeploymentStatus.IN_PROGRESS,
    });

    await expect(service.executeDeployment(newDeploymentId)).rejects.toThrow(
      `Environment 'Staging Environment' is locked by active deployment '${activeDeploymentId}'`,
    );

    expect(mockPrisma.deployment.findFirst).toHaveBeenCalledWith({
      where: {
        environmentId,
        status: DeploymentStatus.IN_PROGRESS,
        id: { not: newDeploymentId },
      },
    });
  });
});
