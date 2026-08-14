import { Test, TestingModule } from '@nestjs/testing';
import { PipelinesService } from './pipelines.service';
import { PipelinesRepository } from './pipelines.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';

import { WorkflowCompilerService } from './workflow-compiler.service';

describe('PipelinesService', () => {
  let service: PipelinesService;

  const mockPipelinesRepository = {
    findByProjectAndSlug: jest.fn(),
    findById: jest.fn(),
    findProjectPipelines: jest.fn(),
    createVersion: jest.fn(),
    findVersions: jest.fn(),
    findVersionByNumber: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
    },
    pipelineDefinition: {
      findFirst: jest.fn(),
    },
  };

  const mockTransactionManager = {
    execute: jest.fn(),
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
        PipelinesService,
        WorkflowCompilerService,
        { provide: PipelinesRepository, useValue: mockPipelinesRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
