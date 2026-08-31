import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import {
  ProjectPermissions,
  OrganizationPermissions,
} from '../../../shared/constants/permissions.constants';

describe('PermissionsGuard RBAC Test Suite', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function createMockContext(
    requiredPermissions: string[] | null,
    user?: any,
    member?: any,
  ): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermissions);

    const request = {
      user,
      member,
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  describe('1. SuperAdmin Bypass', () => {
    it('Positive: should allow SuperAdmin regardless of required permissions', () => {
      const context = createMockContext(
        [ProjectPermissions.CREATE, OrganizationPermissions.DELETE],
        { sub: 'usr_super', role: 'USER', isSuperAdmin: true },
      );
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('2. Organization Tenant Role Permissions', () => {
    it('Positive: should allow OWNER to create projects (project:create)', () => {
      const context = createMockContext(
        [ProjectPermissions.CREATE],
        { sub: 'usr_owner', role: 'USER', isSuperAdmin: false },
        { role: 'OWNER' },
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('Positive: should allow ADMIN to create projects (project:create)', () => {
      const context = createMockContext(
        [ProjectPermissions.CREATE],
        { sub: 'usr_admin', role: 'USER', isSuperAdmin: false },
        { role: 'ADMIN' },
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('Positive: should allow MEMBER to create projects (project:create)', () => {
      const context = createMockContext(
        [ProjectPermissions.CREATE],
        { sub: 'usr_member', role: 'USER', isSuperAdmin: false },
        { role: 'MEMBER' },
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('Negative: should reject VIEWER when attempting to create projects (project:create)', () => {
      const context = createMockContext(
        [ProjectPermissions.CREATE],
        { sub: 'usr_viewer', role: 'USER', isSuperAdmin: false },
        { role: 'VIEWER' },
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('Negative: should reject MEMBER when attempting to delete organization (org:delete)', () => {
      const context = createMockContext(
        [OrganizationPermissions.DELETE],
        { sub: 'usr_member', role: 'USER', isSuperAdmin: false },
        { role: 'MEMBER' },
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('3. Global User Role Fallback (No Member Context Attached)', () => {
    it('Positive: should allow global ADMIN / OWNER users', () => {
      const context = createMockContext([ProjectPermissions.CREATE], {
        sub: 'usr_global_admin',
        role: 'ADMIN',
        isSuperAdmin: false,
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('Positive: should allow standard USER for read-only permissions', () => {
      const context = createMockContext([ProjectPermissions.READ], {
        sub: 'usr_standard',
        role: 'USER',
        isSuperAdmin: false,
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('Negative: should reject standard USER for write permissions without tenant role', () => {
      const context = createMockContext([ProjectPermissions.CREATE], {
        sub: 'usr_standard',
        role: 'USER',
        isSuperAdmin: false,
      });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('Negative: should throw if user context is missing', () => {
      const context = createMockContext([ProjectPermissions.CREATE], null);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
