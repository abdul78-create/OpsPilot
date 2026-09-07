import { Test, TestingModule } from '@nestjs/testing';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsRepository } from './environments.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { EnvironmentConnectionStatus } from '@prisma/client';

/**
 * Integration tests for environment test-connection logic.
 *
 * Tests cover:
 * - NOT_CONFIGURED environment → rejected
 * - KUBERNETES with no credential → CONNECTION_FAILED with safe message
 * - KUBERNETES with credential but no cluster name → CONNECTION_FAILED
 * - KUBERNETES with credential + config → CONFIGURED (not CONNECTED - no live API ping yet)
 * - DOCKER → UNSUPPORTED
 * - SERVERLESS → UNSUPPORTED
 * - VIRTUAL_MACHINE → UNSUPPORTED
 * - STATIC → UNSUPPORTED
 * - Response never contains credential values
 * - Cross-tenant: environment belonging to another project is rejected
 */
describe('EnvironmentsService.testConnection', () => {
  let service: EnvironmentsService;
  let prisma: PrismaService;

  const mockRepo = {
    findById: jest.fn(),
    findByProjectAndSlug: jest.fn(),
    findProjectEnvironments: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const mockContextService = { getCorrelationId: jest.fn().mockReturnValue('test-correlation-id') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentsService,
        { provide: EnvironmentsRepository, useValue: mockRepo },
        {
          provide: PrismaService,
          useValue: {
            project: { findFirst: jest.fn() },
            environment: { findFirst: jest.fn(), update: jest.fn() },
            secret: { findFirst: jest.fn() },
          },
        },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockContextService },
      ],
    }).compile();

    service = module.get<EnvironmentsService>(EnvironmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  function makeEnv(overrides: Record<string, unknown> = {}) {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      projectId: 'proj-owner-1',
      name: 'Staging',
      slug: 'staging',
      type: 'STAGING',
      requiresApproval: false,
      minApprovers: 1,
      allowedRoles: ['OWNER', 'ADMIN'],
      deploymentWindow: null,
      autoRollbackEnabled: true,
      deploymentTargetType: null,
      clusterName: null,
      clusterRegion: null,
      k8sNamespace: null,
      connectionStatus: 'NOT_CONFIGURED',
      credentialsConfigured: false,
      lastConnectionTestedAt: null,
      lastConnectionError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  }

  describe('NOT_CONFIGURED target', () => {
    it('returns NOT_CONFIGURED status when no deploymentTargetType is set', async () => {
      const env = makeEnv({ deploymentTargetType: null });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      const result = await service.testConnection(
        'proj-owner-1',
        '11111111-1111-1111-1111-111111111111',
      );

      expect(result.connectionStatus).toBe(EnvironmentConnectionStatus.NOT_CONFIGURED);
      expect(result.message).toMatch(/no deployment target/i);
      // Verify DB was updated
      expect(prisma.environment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ connectionStatus: 'NOT_CONFIGURED' }),
        }),
      );
    });
  });

  describe('KUBERNETES target', () => {
    it('returns CONNECTION_FAILED with safe message when no credential secret exists', async () => {
      const env = makeEnv({
        deploymentTargetType: 'KUBERNETES',
        clusterName: 'my-cluster',
        k8sNamespace: 'my-ns',
        connectionStatus: 'CONFIGURED',
      });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.secret.findFirst as jest.Mock).mockResolvedValue(null); // no credential
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      const result = await service.testConnection(
        'proj-owner-1',
        '11111111-1111-1111-1111-111111111111',
      );

      expect(result.connectionStatus).toBe(EnvironmentConnectionStatus.CONNECTION_FAILED);
      // Safe message — must NOT contain any credential value
      expect(result.message).not.toMatch(/token|password|kubeconfig|apiKey|secret value/i);
      expect(result.message).toMatch(/credential/i);
      // DB updated with safe error message only
      expect(prisma.environment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            connectionStatus: 'CONNECTION_FAILED',
            lastConnectionError: expect.stringMatching(/credential/i),
          }),
        }),
      );
    });

    it('returns CONNECTION_FAILED when credential exists but cluster name is missing', async () => {
      const env = makeEnv({
        deploymentTargetType: 'KUBERNETES',
        clusterName: null,
        k8sNamespace: 'my-ns',
        connectionStatus: 'CONFIGURED',
      });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.secret.findFirst as jest.Mock).mockResolvedValue({ id: 'sec-1' }); // credential present
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      const result = await service.testConnection(
        'proj-owner-1',
        '11111111-1111-1111-1111-111111111111',
      );

      expect(result.connectionStatus).toBe(EnvironmentConnectionStatus.CONNECTION_FAILED);
      expect(result.message).toMatch(/cluster name|namespace/i);
    });

    it('returns CONFIGURED (not CONNECTED) when credential + metadata present - real ping not yet implemented', async () => {
      const env = makeEnv({
        deploymentTargetType: 'KUBERNETES',
        clusterName: 'my-cluster',
        clusterRegion: 'us-central1',
        k8sNamespace: 'my-namespace',
        connectionStatus: 'CONFIGURED',
      });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.secret.findFirst as jest.Mock).mockResolvedValue({ id: 'sec-1' });
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      const result = await service.testConnection(
        'proj-owner-1',
        '11111111-1111-1111-1111-111111111111',
      );

      // CONFIGURED (not CONNECTED) — honest about real K8S ping not yet implemented
      expect(result.connectionStatus).toBe(EnvironmentConnectionStatus.CONFIGURED);
      // Safe message only — no credential values
      expect(result.message).not.toMatch(/token|password|kubeconfig/i);
    });

    it('NEVER returns credential value in message', async () => {
      const env = makeEnv({
        deploymentTargetType: 'KUBERNETES',
        clusterName: 'my-cluster',
        k8sNamespace: 'my-ns',
      });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.secret.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      const result = await service.testConnection(
        'proj-owner-1',
        '11111111-1111-1111-1111-111111111111',
      );

      // Ensure no secret value leakage
      expect(result.message).not.toMatch(/Bearer\s/);
      expect(result.message).not.toMatch(/eyJ/); // JWT prefix
      expect(result.message).not.toMatch(/BEGIN CERTIFICATE/);
      expect(result.message).not.toMatch(/apikey|api_key/i);
    });
  });

  describe('DOCKER target', () => {
    it('returns UNSUPPORTED for external Docker (OpsPilot runtime only)', async () => {
      const env = makeEnv({ deploymentTargetType: 'DOCKER', connectionStatus: 'CONFIGURED' });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      const result = await service.testConnection(
        'proj-owner-1',
        '11111111-1111-1111-1111-111111111111',
      );

      expect(result.connectionStatus).toBe(EnvironmentConnectionStatus.UNSUPPORTED);
      expect(result.message).toMatch(/docker/i);
    });
  });

  describe('SERVERLESS, VIRTUAL_MACHINE, STATIC targets', () => {
    const unsupportedTypes = ['SERVERLESS', 'VIRTUAL_MACHINE', 'STATIC'];

    for (const targetType of unsupportedTypes) {
      it(`returns UNSUPPORTED for ${targetType}`, async () => {
        const env = makeEnv({ deploymentTargetType: targetType, connectionStatus: 'CONFIGURED' });
        mockRepo.findById.mockResolvedValue(env);
        (prisma.environment.update as jest.Mock).mockResolvedValue(env);

        const result = await service.testConnection(
          'proj-owner-1',
          '11111111-1111-1111-1111-111111111111',
        );

        expect(result.connectionStatus).toBe(EnvironmentConnectionStatus.UNSUPPORTED);
        expect(result.message.length).toBeGreaterThan(10);
      });
    }
  });

  describe('Cross-tenant isolation', () => {
    it('throws NotFoundException when environment belongs to a different project', async () => {
      // Environment belongs to proj-victim, not proj-attacker
      const env = makeEnv({ projectId: 'proj-victim' });
      mockRepo.findById.mockResolvedValue(env);

      await expect(
        service.testConnection('proj-attacker', '11111111-1111-1111-1111-111111111111'),
      ).rejects.toThrow(/not found in target Project/i);

      // Ensure DB update was NOT called — no operation performed for attacker
      expect(prisma.environment.update).not.toHaveBeenCalled();
    });

    it('cannot infer victim credential presence by timing or error shape', async () => {
      // Attacker calls test-connection on victim environment
      const victimEnv = makeEnv({ projectId: 'proj-victim' });
      mockRepo.findById.mockResolvedValue(victimEnv);

      // Should throw NotFoundException — attacker learns nothing about credentials
      await expect(
        service.testConnection('proj-attacker', '11111111-1111-1111-1111-111111111111'),
      ).rejects.toThrow();
      // Secret lookup must not have been called — tenant check happens before secret lookup
      expect(prisma.secret.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('connectionStatus persistence', () => {
    it('persists connectionStatus to DB after every test-connection call', async () => {
      const env = makeEnv({ deploymentTargetType: 'DOCKER', connectionStatus: 'CONFIGURED' });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      await service.testConnection('proj-owner-1', '11111111-1111-1111-1111-111111111111');

      expect(prisma.environment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '11111111-1111-1111-1111-111111111111' },
          data: expect.objectContaining({
            connectionStatus: expect.any(String),
            lastConnectionTestedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('clears lastConnectionError on CONFIGURED status', async () => {
      const env = makeEnv({
        deploymentTargetType: 'KUBERNETES',
        clusterName: 'c',
        k8sNamespace: 'n',
        connectionStatus: 'CONFIGURED',
      });
      mockRepo.findById.mockResolvedValue(env);
      (prisma.secret.findFirst as jest.Mock).mockResolvedValue({ id: 'sec-1' });
      (prisma.environment.update as jest.Mock).mockResolvedValue(env);

      await service.testConnection('proj-owner-1', '11111111-1111-1111-1111-111111111111');

      expect(prisma.environment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastConnectionError: null }),
        }),
      );
    });
  });
});
