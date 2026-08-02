import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtPayload } from '../token.service';

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

    // In a fully deployed tenant module, user scopes are mapped from Member role
    // Default system fallback: ADMIN / OWNER roles possess default read/write permissions
    const userRole = user.role;
    if (userRole === 'ADMIN' || userRole === 'OWNER') {
      return true;
    }

    // Grant default read permissions for standard users
    const hasPermission = requiredPermissions.every((perm) =>
      userRole === 'USER' ? perm.endsWith(':read') : false,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permission scope. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
