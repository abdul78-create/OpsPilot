import { Test, TestingModule } from '@nestjs/testing';
import { SecretsService } from './secrets.service';
import { SecretsRepository } from './secrets.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('SecretsService', () => {
  let service: SecretsService;

  const mockSecretsRepository = {
    findByEnvironmentAndKey: jest.fn(),
    findById: jest.fn(),
    findEnvironmentSecrets: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    environment: {
      findFirst: jest.fn(),
    },
  };

  const mockEncryptionProvider = {
    encrypt: jest.fn().mockResolvedValue({
      encryptedValue: 'encrypted_hex_string',
      iv: 'iv_hex_string',
      authTag: 'tag_hex_string',
      keyVersion: 1,
      algorithm: 'aes-256-gcm',
    }),
    decrypt: jest.fn().mockResolvedValue('decrypted_secret_plaintext'),
    rotateKey: jest.fn(),
    getCurrentKeyVersion: jest.fn().mockReturnValue(1),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
    getStore: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        { provide: SecretsRepository, useValue: mockSecretsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'ISecretEncryptionProvider', useValue: mockEncryptionProvider },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
