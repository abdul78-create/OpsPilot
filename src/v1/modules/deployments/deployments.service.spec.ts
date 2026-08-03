import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentsService } from './deployments.service';
import { DeploymentsRepository } from './deployments.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { ApprovalEngineService } from './services/approval-engine.service';
import { DeploymentRunnerService } from './services/deployment-runner.service';
import { EventBusService } from '../../../core/events/event-bus.service';

import { RequestContextService } from '../../../core/context/request-context.service';

describe('DeploymentsService', () => {
  let service: DeploymentsService;

  const mockDeploymentsRepository = {
    findEnvironmentDeployments: jest.fn(),
    findDeploymentDetails: jest.fn(),
    createApproval: jest.fn(),
    findApprovals: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    environment: {
      findFirst: jest.fn(),
    },
    pipelineRun: {
      findFirst: jest.fn(),
    },
  };

  const mockTransactionManager = {
    execute: jest.fn(),
  };

  const mockApprovalEngine = {
    evaluateEnvironmentProtection: jest.fn().mockReturnValue({
      requiresApproval: false,
      minApprovers: 1,
      allowedRoles: ['OWNER', 'ADMIN'],
      isAllowedNow: true,
    }),
    validateApproverRole: jest.fn(),
    validateDeploymentWindow: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: DeploymentsRepository, useValue: mockDeploymentsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: ApprovalEngineService, useValue: mockApprovalEngine },
        {
          provide: DeploymentRunnerService,
          useValue: { executeDeployment: jest.fn(), executeRollback: jest.fn() },
        },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
