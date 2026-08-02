import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './projects.repository';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectsRepository = {
    findByOrganizationAndSlug: jest.fn(),
    findById: jest.fn(),
    findOrganizationProjects: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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
        ProjectsService,
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
