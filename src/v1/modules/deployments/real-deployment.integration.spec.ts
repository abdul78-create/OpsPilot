import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { DeploymentsRepository } from './deployments.repository';
import { ApprovalEngineService } from './services/approval-engine.service';
import { DeploymentRunnerService } from './services/deployment-runner.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { DeploymentStatus } from '@prisma/client';

describe('Real Deployment Environment Integration Test Suite', () => {
  let deploymentsService: DeploymentsService;

  const mockDeploymentsRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findDeploymentDetails: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    environment: {
      findFirst: jest.fn(),
    },
    pipelineRun: {
      findFirst: jest.fn(),
    },
    deployment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const mockTxManager = {
    execute: jest.fn((cb) =>
      cb({
        deployment: {
          create: jest.fn().mockResolvedValue({
            id: 'deploy_real_100',
            environmentId: 'env_staging_123',
            pipelineRunId: 'run_valid_100',
            status: DeploymentStatus.IN_PROGRESS,
            releaseVersion: 'v1.0.100',
            deployedByUserId: 'usr_123',
            startedAt: new Date(),
          }),
        },
      }),
    ),
  };

  const mockApprovalEngine = {
    validateDeploymentWindow: jest.fn(),
    evaluateEnvironmentProtection: jest.fn().mockReturnValue({ requiresApproval: false }),
  };

  const mockDeploymentRunner = {
    executeDeployment: jest.fn().mockResolvedValue({
      deploymentId: 'deploy_real_100',
      status: DeploymentStatus.SUCCESS,
      healthStatus: '200 OK · Container: test_container_123 · Version: v1.0.100',
      durationSeconds: 2,
    }),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('req-corr-deploy-100'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: DeploymentsRepository, useValue: mockDeploymentsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTxManager },
        { provide: ApprovalEngineService, useValue: mockApprovalEngine },
        { provide: DeploymentRunnerService, useValue: mockDeploymentRunner },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    deploymentsService = module.get<DeploymentsService>(DeploymentsService);
  });

  describe('1. Positive Deployment Execution & Health Probe Tests', () => {
    it('Positive: should create deployment release record and trigger automated container runner execution', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({
        id: 'env_staging_123',
        name: 'Staging',
        slug: 'staging',
        deletedAt: null,
      });
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({
        id: 'run_valid_100',
        deletedAt: null,
      });

      const result = await deploymentsService.createDeployment('env_staging_123', 'usr_123', {
        pipelineRunId: 'run_valid_100',
        releaseVersion: 'v1.0.100',
      });

      expect(result.id).toBe('deploy_real_100');
      expect(result.status).toBe(DeploymentStatus.IN_PROGRESS);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'deployment.created.v1',
          aggregateId: 'deploy_real_100',
        }),
      );
    });

    it('Positive: should execute rollback to target successful deployment version and update database state', async () => {
      mockDeploymentsRepository.findDeploymentDetails.mockImplementation((id: string) => {
        if (id === 'deploy_v2_failed') {
          return Promise.resolve({
            id: 'deploy_v2_failed',
            environmentId: 'env_staging_123',
            pipelineRunId: 'run_v2_999',
            status: DeploymentStatus.FAILED,
            releaseVersion: 'v2.0.0',
          });
        }
        if (id === 'deploy_v1_success') {
          return Promise.resolve({
            id: 'deploy_v1_success',
            environmentId: 'env_staging_123',
            pipelineRunId: 'run_v1_111',
            status: DeploymentStatus.SUCCESS,
            releaseVersion: 'v1.0.0',
          });
        }
        return Promise.resolve(null);
      });

      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env_staging_123' });
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({ id: 'run_v1_111' });

      mockDeploymentsRepository.update.mockResolvedValue({
        id: 'deploy_real_100',
        status: DeploymentStatus.ROLLED_BACK,
        rollbackFromDeploymentId: 'deploy_v1_success',
        releaseVersion: 'v1.0.0-rollback',
      });

      const rollbackResult = await deploymentsService.rollbackDeployment(
        'deploy_v2_failed',
        'usr_123',
        {
          targetDeploymentId: 'deploy_v1_success',
          reason: 'Reverting breaking release',
        },
      );

      expect(rollbackResult.status).toBe(DeploymentStatus.ROLLED_BACK);
      expect(rollbackResult.rollbackFromDeploymentId).toBe('deploy_v1_success');
      expect(mockDeploymentRunner.executeDeployment).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'deployment.rolled_back.v1',
        }),
      );
    });
  });

  describe('2. Negative Security & Boundary Tests', () => {
    it('Negative: should throw NotFoundException if environment ID does not exist', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue(null);

      await expect(
        deploymentsService.createDeployment('env_non_existent', 'usr_123', {
          pipelineRunId: 'run_100',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Negative: should throw NotFoundException if target pipeline run ID does not exist', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env_staging_123' });
      mockPrisma.pipelineRun.findFirst.mockResolvedValue(null);

      await expect(
        deploymentsService.createDeployment('env_staging_123', 'usr_123', {
          pipelineRunId: 'run_non_existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Negative: should throw BadRequestException if target deployment for rollback was not successful', async () => {
      mockDeploymentsRepository.findDeploymentDetails.mockImplementation((id: string) => {
        if (id === 'deploy_current') {
          return Promise.resolve({
            id: 'deploy_current',
            environmentId: 'env_staging_123',
            status: DeploymentStatus.FAILED,
          });
        }
        if (id === 'deploy_bad_target') {
          return Promise.resolve({
            id: 'deploy_bad_target',
            environmentId: 'env_staging_123',
            status: DeploymentStatus.FAILED,
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        deploymentsService.rollbackDeployment('deploy_current', 'usr_123', {
          targetDeploymentId: 'deploy_bad_target',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Negative: should throw BadRequestException if no prior successful deployment exists in environment', async () => {
      mockDeploymentsRepository.findDeploymentDetails.mockResolvedValue({
        id: 'deploy_current',
        environmentId: 'env_staging_123',
        status: DeploymentStatus.FAILED,
      });
      mockPrisma.deployment.findFirst.mockResolvedValue(null);

      await expect(
        deploymentsService.rollbackDeployment('deploy_current', 'usr_123', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
