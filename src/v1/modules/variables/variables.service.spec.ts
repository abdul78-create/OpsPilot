import { Test, TestingModule } from '@nestjs/testing';
import { VariablesService } from './variables.service';
import { VariablesRepository } from './variables.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('VariablesService', () => {
  let service: VariablesService;

  const mockVariablesRepository = {
    findByEnvironmentAndKey: jest.fn(),
    findById: jest.fn(),
    findEnvironmentVariables: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    environment: {
      findFirst: jest.fn(),
    },
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
        VariablesService,
        { provide: VariablesRepository, useValue: mockVariablesRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<VariablesService>(VariablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
