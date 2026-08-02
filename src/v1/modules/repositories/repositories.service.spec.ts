import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesService } from './repositories.service';
import { RepositoriesRepository } from './repositories.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('RepositoriesService', () => {
  let service: RepositoriesService;

  const mockRepositoriesRepository = {
    findByProjectAndUrl: jest.fn(),
    findById: jest.fn(),
    findProjectRepositories: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
    },
  };

  const mockRepositoryProvider = {
    validateConnection: jest.fn().mockResolvedValue(true),
    createWebhook: jest.fn().mockResolvedValue({
      webhookId: 'mock_wh_123',
      webhookSecret: 'mock_sec_123',
    }),
    deleteWebhook: jest.fn().mockResolvedValue(undefined),
    getDefaultBranch: jest.fn().mockResolvedValue('main'),
    listBranches: jest.fn().mockResolvedValue(['main', 'dev']),
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
        RepositoriesService,
        { provide: RepositoriesRepository, useValue: mockRepositoriesRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'IRepositoryProvider', useValue: mockRepositoryProvider },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
