import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PrismaService } from '../../../core/database/prisma.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { ProjectPermissions } from '../../../shared/constants/permissions.constants';

describe('Project Creation Multi-Tenant RBAC Integration Suite', () => {
  let permissionsGuard: PermissionsGuard;
  let tenantGuard: TenantGuard;
  let reflector: Reflector;

  const mockPrisma = {
    organization: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
  };

  const mockContextService = {
    getStore: jest.fn().mockReturnValue({ tenantId: null }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    reflector = new Reflector();
    permissionsGuard = new PermissionsGuard(reflector);
    tenantGuard = new TenantGuard(
      mockPrisma as unknown as PrismaService,
      mockContextService as unknown as RequestContextService,
      reflector,
    );
  });

  function buildContext(options: {
    orgIdParam?: string;
    orgHeader?: string;
    user?: any;
    requiredPermissions?: string[];
  }): { context: ExecutionContext; request: any } {
    const request: any = {
      params: { orgId: options.orgIdParam },
      headers: { 'x-organization-id': options.orgHeader },
      user: options.user,
    };

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') return options.requiredPermissions ?? [ProjectPermissions.CREATE];
      return undefined;
    });

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  describe('1. Legitimate Authenticated Organization Owner / Admin Project Creation', () => {
    it('Positive: should allow OWNER to pass TenantGuard and PermissionsGuard for project:create', async () => {
      const orgId = 'org-tenant-100';
      const userId = 'usr-owner-100';

      mockPrisma.organization.findFirst.mockResolvedValue({
        id: orgId,
        slug: 'acme-corp',
        name: 'Acme Corp',
        deletedAt: null,
      });

      mockPrisma.member.findFirst.mockResolvedValue({
        id: 'mem-100',
        organizationId: orgId,
        userId: userId,
        role: 'OWNER',
        deletedAt: null,
      });

      const { context, request } = buildContext({
        orgIdParam: orgId,
        user: { sub: userId, email: 'owner@acme.com', role: 'USER', isSuperAdmin: false },
        requiredPermissions: [ProjectPermissions.CREATE],
      });

      const tenantAllowed = await tenantGuard.canActivate(context);
      expect(tenantAllowed).toBe(true);
      expect(request.organization.id).toBe(orgId);
      expect(request.member.role).toBe('OWNER');

      const permAllowed = permissionsGuard.canActivate(context);
      expect(permAllowed).toBe(true);
    });

    it('Positive: should allow MEMBER to create a project in their organization', async () => {
      const orgId = 'org-tenant-100';
      const userId = 'usr-dev-100';

      mockPrisma.organization.findFirst.mockResolvedValue({
        id: orgId,
        slug: 'acme-corp',
        name: 'Acme Corp',
        deletedAt: null,
      });

      mockPrisma.member.findFirst.mockResolvedValue({
        id: 'mem-101',
        organizationId: orgId,
        userId: userId,
        role: 'MEMBER',
        deletedAt: null,
      });

      const { context, request } = buildContext({
        orgIdParam: orgId,
        user: { sub: userId, email: 'dev@acme.com', role: 'USER', isSuperAdmin: false },
        requiredPermissions: [ProjectPermissions.CREATE],
      });

      const tenantAllowed = await tenantGuard.canActivate(context);
      expect(tenantAllowed).toBe(true);
      expect(request.member.role).toBe('MEMBER');

      const permAllowed = permissionsGuard.canActivate(context);
      expect(permAllowed).toBe(true);
    });
  });

  describe('2. Negative Authorization & Boundary Tests', () => {
    it('Negative: should reject VIEWER role from creating a project (403 Forbidden)', async () => {
      const orgId = 'org-tenant-100';
      const userId = 'usr-auditor-100';

      mockPrisma.organization.findFirst.mockResolvedValue({
        id: orgId,
        slug: 'acme-corp',
        name: 'Acme Corp',
        deletedAt: null,
      });

      mockPrisma.member.findFirst.mockResolvedValue({
        id: 'mem-102',
        organizationId: orgId,
        userId: userId,
        role: 'VIEWER',
        deletedAt: null,
      });

      const { context } = buildContext({
        orgIdParam: orgId,
        user: { sub: userId, email: 'auditor@acme.com', role: 'USER', isSuperAdmin: false },
        requiredPermissions: [ProjectPermissions.CREATE],
      });

      await tenantGuard.canActivate(context);
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('Negative: should reject cross-tenant unauthorized user who is not a member of target organization (403 Forbidden)', async () => {
      const targetOrgId = 'org-other-company';
      const attackerUserId = 'usr-attacker-999';

      mockPrisma.organization.findFirst.mockResolvedValue({
        id: targetOrgId,
        slug: 'other-corp',
        deletedAt: null,
      });

      // Non-member returns null
      mockPrisma.member.findFirst.mockResolvedValue(null);

      const { context } = buildContext({
        orgIdParam: targetOrgId,
        user: {
          sub: attackerUserId,
          email: 'attacker@evil.com',
          role: 'USER',
          isSuperAdmin: false,
        },
        requiredPermissions: [ProjectPermissions.CREATE],
      });

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
