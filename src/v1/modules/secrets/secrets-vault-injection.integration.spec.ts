import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { SecretsRepository } from './secrets.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('Secrets Vault Encryption & Secure Environment Injection Integration Test Suite', () => {
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
    encrypt: jest.fn().mockImplementation((val: string) =>
      Promise.resolve({
        encryptedValue: `enc_${Buffer.from(val).toString('hex')}`,
        iv: 'a1b2c3d4e5f67890a1b2c3d4',
        authTag: 'f9e8d7c6b5a43210f9e8d7c6',
        keyVersion: 1,
        algorithm: 'aes-256-gcm',
      }),
    ),
    decrypt: jest.fn().mockImplementation((enc: { encryptedValue: string }) => {
      const hex = enc.encryptedValue.replace('enc_', '');
      return Promise.resolve(Buffer.from(hex, 'hex').toString('utf8'));
    }),
    rotateKey: jest.fn().mockResolvedValue({
      encryptedValue: 'enc_rotated_hex_value',
      iv: 'iv_rotated_hex',
      authTag: 'tag_rotated_hex',
      keyVersion: 2,
    }),
    getCurrentKeyVersion: jest.fn().mockReturnValue(2),
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('req-corr-secrets-888'),
    getStore: jest.fn().mockReturnValue({ ipAddress: '192.168.1.100' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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

  describe('1. Positive Secrets Encryption & Vault Operations', () => {
    it('Positive: should encrypt and store secret value with AES-256-GCM metadata', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({
        id: 'env_staging_456',
        deletedAt: null,
      });
      mockSecretsRepository.findByEnvironmentAndKey.mockResolvedValue(null);
      mockSecretsRepository.create.mockResolvedValue({
        id: 'sec_db_url_100',
        environmentId: 'env_staging_456',
        key: 'DATABASE_URL',
        encryptedValue:
          'enc_706f737467726573716c3a2f2f757365723a70617373406c6f63616c686f73743a353433322f6f707370696c6f74',
        iv: 'a1b2c3d4e5f67890a1b2c3d4',
        authTag: 'f9e8d7c6b5a43210f9e8d7c6',
        algorithm: 'aes-256-gcm',
        keyVersion: 1,
        lastRotatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.create('env_staging_456', 'usr_admin_1', {
        key: 'DATABASE_URL',
        value: 'postgresql://user:pass@localhost:5432/opspilot',
      });

      expect(res.id).toBe('sec_db_url_100');
      expect(res.key).toBe('DATABASE_URL');
      expect(res.isConfigured).toBe(true);
      expect((res as unknown as Record<string, unknown>).encryptedValue).toBeUndefined(); // Masked response never leaks encryptedValue or IV
      expect(mockEncryptionProvider.encrypt).toHaveBeenCalledWith(
        'postgresql://user:pass@localhost:5432/opspilot',
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'secret.created.v1' }),
      );
    });

    it('Positive: should decrypt and reveal plaintext secret value with audit logging', async () => {
      mockSecretsRepository.findById.mockResolvedValue({
        id: 'sec_db_url_100',
        environmentId: 'env_staging_456',
        key: 'DATABASE_URL',
        encryptedValue:
          'enc_706f737467726573716c3a2f2f757365723a70617373406c6f63616c686f73743a353433322f6f707370696c6f74',
        iv: 'a1b2c3d4e5f67890a1b2c3d4',
        authTag: 'f9e8d7c6b5a43210f9e8d7c6',
        keyVersion: 1,
      });

      const revealed = await service.revealSecret(
        'env_staging_456',
        'usr_admin_1',
        'sec_db_url_100',
      );

      expect(revealed.key).toBe('DATABASE_URL');
      expect(revealed.value).toBe('postgresql://user:pass@localhost:5432/opspilot');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'secret.accessed.v1' }),
      );
    });
  });

  describe('2. Negative Security & Boundary Tests', () => {
    it('Negative: should throw ConflictException if secret key already exists in Environment', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env_staging_456' });
      mockSecretsRepository.findByEnvironmentAndKey.mockResolvedValue({ id: 'sec_existing' });

      await expect(
        service.create('env_staging_456', 'usr_admin_1', {
          key: 'DATABASE_URL',
          value: 'postgresql://newpass@localhost:5432/db',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Negative: should throw NotFoundException if target secret ID does not exist', async () => {
      mockSecretsRepository.findById.mockResolvedValue(null);

      await expect(
        service.revealSecret('env_staging_456', 'usr_admin_1', 'sec_non_existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
