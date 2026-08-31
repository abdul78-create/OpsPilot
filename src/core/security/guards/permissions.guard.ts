import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtPayload } from '../token.service';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    'org:read',
    'org:update',
    'org:delete',
    'org:billing',
    'member:read',
    'member:update',
    'member:delete',
    'member:invite',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'env:create',
    'env:read',
    'env:update',
    'env:delete',
    'env:deploy',
    'secret:create',
    'secret:read',
    'secret:update',
    'secret:delete',
    'secret:rotate',
    'secret:reveal',
    'pipeline:create',
    'pipeline:read',
    'pipeline:update',
    'pipeline:delete',
    'pipeline:trigger',
    'pipeline:cancel',
  ],
  ADMIN: [
    'org:read',
    'org:update',
    'org:billing',
    'member:read',
    'member:update',
    'member:invite',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'env:create',
    'env:read',
    'env:update',
    'env:delete',
    'env:deploy',
    'secret:create',
    'secret:read',
    'secret:update',
    'secret:delete',
    'secret:rotate',
    'secret:reveal',
    'pipeline:create',
    'pipeline:read',
    'pipeline:update',
    'pipeline:delete',
    'pipeline:trigger',
    'pipeline:cancel',
  ],
  MEMBER: [
    'org:read',
    'member:read',
    'project:create',
    'project:read',
    'project:update',
    'env:create',
    'env:read',
    'env:update',
    'env:deploy',
    'secret:create',
    'secret:read',
    'secret:update',
    'pipeline:create',
    'pipeline:read',
    'pipeline:update',
    'pipeline:trigger',
    'pipeline:cancel',
  ],
  VIEWER: ['org:read', 'member:read', 'project:read', 'env:read', 'secret:read', 'pipeline:read'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('User context unavailable for permission evaluation');
    }

    // SuperAdmin bypasses all permission checks
    if (user.isSuperAdmin) {
      return true;
    }

    // 1. Evaluate organization member role from tenant context (attached by TenantGuard)
    const memberRole = request.member?.role;
    if (memberRole && ROLE_PERMISSIONS[memberRole]) {
      const allowedPermissions = ROLE_PERMISSIONS[memberRole];
      const hasAllPermissions = requiredPermissions.every((perm) =>
        allowedPermissions.includes(perm),
      );

      if (hasAllPermissions) {
        return true;
      }

      throw new ForbiddenException(
        `Insufficient permission scope. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    // 2. Fallback to global user role when request is outside tenant-scoped member context
    const userRole = user.role;
    if (userRole === 'ADMIN' || userRole === 'OWNER' || userRole === 'SUPERADMIN') {
      return true;
    }

    // Grant default read permissions for standard authenticated users
    const hasReadPermission = requiredPermissions.every((perm) =>
      userRole === 'USER' ? perm.endsWith(':read') : false,
    );

    if (!hasReadPermission) {
      throw new ForbiddenException(
        `Insufficient permission scope. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
