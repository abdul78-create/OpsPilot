import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysRepository } from './api-keys.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('API Keys & Service Accounts Security Integration Tests', () => {
  let service: ApiKeysService;

  const orgId = 'org-sec-keys-001';
  const userId = 'user-sec-001';

  let inMemoryKeys: any[] = [];

  const mockPrisma = {
    apiKey: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) {
          return Promise.resolve(inMemoryKeys.find((k) => k.id === where.id) || null);
        }
        if (where.keyHash) {
          return Promise.resolve(inMemoryKeys.find((k) => k.keyHash === where.keyHash) || null);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let results = [...inMemoryKeys];
        if (where?.organizationId) {
          results = results.filter((k) => k.organizationId === where.organizationId);
        }
        return Promise.resolve(results);
      }),
      create: jest.fn().mockImplementation((args) => {
        const item = {
          id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          organizationId: args.data.organization.connect.id,
          userId: args.data.user.connect.id,
          name: args.data.name,
          keyPrefix: args.data.keyPrefix,
          keyHash: args.data.keyHash,
          scopes: args.data.scopes,
          expiresAt: args.data.expiresAt,
          isRevoked: args.data.isRevoked,
          lastUsedAt: null,
          createdAt: new Date(),
        };
        inMemoryKeys.push(item);
        return Promise.resolve(item);
      }),
      update: jest.fn().mockImplementation(({ where: { id }, data }) => {
        const index = inMemoryKeys.findIndex((k) => k.id === id);
        if (index === -1) return Promise.resolve(null);
        inMemoryKeys[index] = { ...inMemoryKeys[index], ...data };
        return Promise.resolve(inMemoryKeys[index]);
      }),
    },
  };

  beforeAll(async () => {
    inMemoryKeys = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        ApiKeysRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  beforeEach(() => {
    inMemoryKeys = [];
  });

  // POSITIVE TEST
  it('SECURITY [POSITIVE]: should generate cryptographically secure API key and validate it successfully', async () => {
    const created = await service.create(orgId, userId, {
      name: 'CI GitHub Runner Token',
      scopes: ['read', 'write', 'deploy'],
      expiresInDays: 30,
    });

    expect(created.apiKey.id).toBeDefined();
    expect(created.apiKey.name).toBe('CI GitHub Runner Token');
    expect(created.rawKey).toMatch(/^opspilot_live_[a-f0-9]{48}$/);
    expect(created.apiKey.keyPrefix).toContain('opspilot_live_');
    expect(created.apiKey.keyHash).toBeDefined();

    // Authenticate with valid key
    const validated = await service.validateKey(created.rawKey, 'deploy');
    expect(validated.id).toBe(created.apiKey.id);
    expect(validated.organizationId).toBe(orgId);
  });

  // NEGATIVE TEST 1: Invalid Key Format
  it('SECURITY [NEGATIVE]: should reject malformed or non-prefixed key with 401 Unauthorized', async () => {
    await expect(service.validateKey('invalid_secret_token_12345')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // NEGATIVE TEST 2: Non-existent / Tampered Key
  it('SECURITY [NEGATIVE]: should reject non-existent or tampered API key with 401 Unauthorized', async () => {
    await expect(
      service.validateKey('opspilot_live_000000000000000000000000000000000000000000000000'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // NEGATIVE TEST 3: Revoked Key
  it('SECURITY [NEGATIVE]: should reject revoked API key with 401 Unauthorized', async () => {
    const created = await service.create(orgId, userId, {
      name: 'Temporary Admin Key',
      scopes: ['read', 'write', 'deploy'],
    });

    // Revoke key
    await service.revoke(orgId, created.apiKey.id);

    // Attempt to authenticate
    await expect(service.validateKey(created.rawKey, 'read')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // NEGATIVE TEST 4: Expired Key
  it('SECURITY [NEGATIVE]: should reject expired API key with 401 Unauthorized', async () => {
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const rawKey = `opspilot_live_${rawSecret}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Create an already-expired key directly in repository
    inMemoryKeys.push({
      id: 'expired-key-1',
      organizationId: orgId,
      userId,
      name: 'Expired Staging Key',
      keyPrefix: `opspilot_live_${rawSecret.slice(0, 6)}...`,
      keyHash,
      scopes: ['read', 'write'],
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day in the past
      isRevoked: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    });

    await expect(service.validateKey(rawKey, 'read')).rejects.toThrow(UnauthorizedException);
  });

  // NEGATIVE TEST 5: Insufficient / Mismatched Scope
  it('SECURITY [NEGATIVE]: should reject request when API key lacks required scope with 403 Forbidden', async () => {
    const created = await service.create(orgId, userId, {
      name: 'Read-Only Telemetry Token',
      scopes: ['read'],
    });

    // Attempting an action requiring 'deploy' permission
    await expect(service.validateKey(created.rawKey, 'deploy')).rejects.toThrow(ForbiddenException);
  });

  // POSITIVE TEST: Wildcard / Matching Scope
  it('SECURITY [POSITIVE]: should allow execution when API key has wildcard or matching scope', async () => {
    const created = await service.create(orgId, userId, {
      name: 'SuperAdmin Service Account',
      scopes: ['*'],
    });

    const validated = await service.validateKey(created.rawKey, 'custom_action');
    expect(validated.id).toBe(created.apiKey.id);
  });
});
