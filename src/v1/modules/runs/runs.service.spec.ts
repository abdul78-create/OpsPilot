import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { RunsService } from './runs.service';
import { RunsRepository } from './runs.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { TriggerEngineService } from './services/trigger-engine.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';

describe('RunsService', () => {
  let service: RunsService;

  const mockRunsRepository = {
    findPipelineRuns: jest.fn(),
    findRunDetails: jest.fn(),
    createJob: jest.fn(),
    updateJob: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    pipelineDefinition: {
      findFirst: jest.fn(),
    },
  };

  const mockTransactionManager = {
    execute: jest.fn(),
  };

  const mockTriggerEngine = {
    normalizeTriggerRequest: jest.fn().mockReturnValue({
      pipelineDefinitionId: 'pipe_123',
      pipelineVersionId: 'ver_123',
      triggerType: 'MANUAL',
      triggeredBy: 'usr_123',
      commitSha: 'head',
      branch: 'main',
    }),
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
        RunsService,
        { provide: RunsRepository, useValue: mockRunsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: TriggerEngineService, useValue: mockTriggerEngine },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        {
          provide: getQueueToken(PIPELINE_RUN_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<RunsService>(RunsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
