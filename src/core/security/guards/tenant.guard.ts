import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../context/request-context.service';
import { JwtPayload } from '../token.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextService: RequestContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('User context unavailable for tenant authorization');
    }

    // SuperAdmin bypasses tenant check
    if (user.isSuperAdmin) {
      return true;
    }

    // Resolve target Organization ID or Slug from request headers or orgId param
    const orgIdOrSlug =
      request.headers['x-organization-id'] ||
      request.headers['x-tenant-id'] ||
      request.params.orgId;

    if (!orgIdOrSlug) {
      throw new BadRequestException('Organization identifier (orgId / slug) is required');
    }

    // Find Organization
    const organization = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: String(orgIdOrSlug) }, { slug: String(orgIdOrSlug) }],
        deletedAt: null,
      },
    });

    if (!organization) {
      throw new ForbiddenException('Organization not found or access denied');
    }

    // Verify user's active membership
    const membership = await this.prisma.member.findFirst({
      where: {
        organizationId: organization.id,
        userId: user.sub,
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: You are not a member of this Organization');
    }

    // Attach resolved organization context to request & context store
    request.organization = organization;
    request.member = membership;

    const currentStore = this.contextService.getStore();
    if (currentStore) {
      currentStore.tenantId = organization.id;
    }

    return true;
  }
}
