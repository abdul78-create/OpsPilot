import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './organizations.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { HashService } from '../../../core/security/hash.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockOrgRepository = {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findUserOrganizations: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    organization: {
      findFirst: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockTransactionManager = {
    execute: jest.fn(),
  };

  const mockHashService = {
    hashSha256: jest.fn().mockReturnValue('mock-hash'),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
    getTenantId: jest.fn().mockReturnValue('mock-tenant-id'),
  };

  const mockNotificationService = {
    sendInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: OrganizationsRepository, useValue: mockOrgRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: HashService, useValue: mockHashService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        { provide: 'INotificationService', useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
