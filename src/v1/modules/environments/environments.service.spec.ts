import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsRepository } from './environments.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { EnvironmentType } from '@prisma/client';
import { DeploymentTargetType } from './enums/deployment-target-type.enum';

describe('EnvironmentsService & Multi-Tenant Isolation Suite', () => {
  let service: EnvironmentsService;
  let tenantGuard: TenantGuard;

  const mockEnvironmentsRepository = {
    findByProjectAndSlug: jest.fn(),
    findById: jest.fn(),
    findProjectEnvironments: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
    getStore: jest.fn().mockReturnValue({ tenantId: '' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentsService,
        { provide: EnvironmentsRepository, useValue: mockEnvironmentsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    const mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    service = module.get<EnvironmentsService>(EnvironmentsService);
    tenantGuard = new TenantGuard(
      mockPrisma as any,
      mockRequestContext as any,
      mockReflector as any,
    );
  });

  describe('EnvironmentsService CRUD with Deployment Target Configuration', () => {
    it('1. Successfully creates an environment with real deployment target configuration', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj_tenant_a',
        organizationId: 'org_tenant_a',
      });
      mockEnvironmentsRepository.findByProjectAndSlug.mockResolvedValue(null);
      mockEnvironmentsRepository.create.mockImplementation((_data) =>
        Promise.resolve({
          id: 'env_staging_01',
          projectId: 'proj_tenant_a',
          name: 'Staging East',
          slug: 'staging-east',
          type: EnvironmentType.STAGING,
          deploymentTargetType: DeploymentTargetType.KUBERNETES,
          clusterName: 'tenant-a-k8s-cluster',
          clusterRegion: 'us-east-1',
          k8sNamespace: 'tenant-a-staging',
          requiresApproval: false,
          minApprovers: 1,
          autoRollbackEnabled: true,
        }),
      );

      const result = await service.create('proj_tenant_a', 'user_a', {
        name: 'Staging East',
        type: EnvironmentType.STAGING,
        deploymentTargetType: DeploymentTargetType.KUBERNETES,
        clusterName: 'tenant-a-k8s-cluster',
        clusterRegion: 'us-east-1',
        k8sNamespace: 'tenant-a-staging',
      });

      expect((result as any).id).toBe('env_staging_01');
      expect((result as any).deploymentTargetType).toBe(DeploymentTargetType.KUBERNETES);
      expect((result as any).clusterName).toBe('tenant-a-k8s-cluster');
      expect((result as any).k8sNamespace).toBe('tenant-a-staging');
      expect(mockEnvironmentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deploymentTargetType: DeploymentTargetType.KUBERNETES,
          clusterName: 'tenant-a-k8s-cluster',
          clusterRegion: 'us-east-1',
          k8sNamespace: 'tenant-a-staging',
        }),
      );
    });

    it('2. Successfully updates deployment target configuration on an existing environment', async () => {
      mockEnvironmentsRepository.findByProjectAndSlug.mockResolvedValue({
        id: 'env_staging_01',
        projectId: 'proj_tenant_a',
        slug: 'staging',
        name: 'Staging',
      });
      mockEnvironmentsRepository.update.mockResolvedValue({
        id: 'env_staging_01',
        projectId: 'proj_tenant_a',
        slug: 'staging',
        name: 'Staging',
        deploymentTargetType: DeploymentTargetType.KUBERNETES,
        clusterName: 'customer-eks-cluster',
        clusterRegion: 'eu-central-1',
        k8sNamespace: 'customer-staging',
      });

      const updated = await service.update('proj_tenant_a', 'user_a', 'staging', {
        deploymentTargetType: DeploymentTargetType.KUBERNETES,
        clusterName: 'customer-eks-cluster',
        clusterRegion: 'eu-central-1',
        k8sNamespace: 'customer-staging',
      });

      expect((updated as any).clusterName).toBe('customer-eks-cluster');
      expect((updated as any).k8sNamespace).toBe('customer-staging');
      expect(mockEnvironmentsRepository.update).toHaveBeenCalledWith(
        'env_staging_01',
        expect.objectContaining({
          clusterName: 'customer-eks-cluster',
          k8sNamespace: 'customer-staging',
        }),
      );
    });

    it('3. Prevents soft deletion of default core environments', async () => {
      mockEnvironmentsRepository.findByProjectAndSlug.mockResolvedValue({
        id: 'env_prod_01',
        projectId: 'proj_tenant_a',
        slug: 'production',
        name: 'Production',
      });

      await expect(service.softDelete('proj_tenant_a', 'user_a', 'production')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Multi-Tenant Isolation & Cross-Tenant Access Protection', () => {
    function createMockContext(
      user: { sub: string; isSuperAdmin?: boolean },
      params: Record<string, string>,
      headers: Record<string, string> = {},
      body: Record<string, any> = {},
    ): ExecutionContext {
      const request = {
        user,
        params,
        headers,
        body,
      };
      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;
    }

    it('4. Positive: Tenant A user can access Tenant A project environments', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj_tenant_a',
        organizationId: 'org_tenant_a',
        deletedAt: null,
      });
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: 'org_tenant_a',
        deletedAt: null,
      });
      mockPrisma.member.findFirst.mockResolvedValue({
        id: 'member_a',
        organizationId: 'org_tenant_a',
        userId: 'user_a',
        deletedAt: null,
      });

      const context = createMockContext({ sub: 'user_a' }, { projectId: 'proj_tenant_a' });
      const canActivate = await tenantGuard.canActivate(context);

      expect(canActivate).toBe(true);
    });

    it('5. Negative: Tenant B user cannot access Tenant A project environments (Forbidden)', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj_tenant_a',
        organizationId: 'org_tenant_a',
        deletedAt: null,
      });
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: 'org_tenant_a',
        deletedAt: null,
      });
      // User B is NOT a member of Org A
      mockPrisma.member.findFirst.mockResolvedValue(null);

      const context = createMockContext({ sub: 'user_b' }, { projectId: 'proj_tenant_a' });

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('6. Negative: Tampered x-organization-id header does not bypass project tenant isolation', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj_tenant_a',
        organizationId: 'org_tenant_a',
        deletedAt: null,
      });
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: 'org_tenant_a',
        deletedAt: null,
      });
      mockPrisma.member.findFirst.mockResolvedValue(null);

      // User B claims they are calling under org_tenant_b but passes proj_tenant_a
      const context = createMockContext(
        { sub: 'user_b' },
        { projectId: 'proj_tenant_a' },
        { 'x-organization-id': 'org_tenant_b' },
      );

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('7. Negative: Accessing non-existent project returns NotFoundException', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const context = createMockContext({ sub: 'user_a' }, { projectId: 'proj_non_existent' });

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(NotFoundException);
    });
  });
});
