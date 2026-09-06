import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
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

    // Resolve target Organization ID or Slug from request headers, orgId param, or projectId param
    let orgIdOrSlug =
      request.headers['x-organization-id'] ||
      request.headers['x-tenant-id'] ||
      request.params?.orgId ||
      request.params?.organizationId;

    // 1. Project-scoped resolution
    const targetProjectId =
      request.params?.projectId || request.body?.projectId || request.query?.projectId;
    if (targetProjectId && this.prisma.project?.findFirst) {
      const project = await this.prisma.project.findFirst({
        where: { id: String(targetProjectId), deletedAt: null },
      });
      if (!project) {
        throw new NotFoundException(`Project '${targetProjectId}' not found`);
      }
      // Strictly bind orgIdOrSlug to the project's organization
      orgIdOrSlug = project.organizationId;
    }

    // 2. Environment-scoped resolution
    const targetEnvId =
      request.params?.environmentId || request.body?.environmentId || request.query?.environmentId;
    if (targetEnvId && this.prisma.environment?.findFirst) {
      const env = await this.prisma.environment.findFirst({
        where: { id: String(targetEnvId), deletedAt: null },
        include: { project: true },
      });
      if (!env) {
        throw new NotFoundException(`Environment '${targetEnvId}' not found`);
      }
      orgIdOrSlug = env.project.organizationId;
    }

    // 3. Pipeline-scoped resolution
    const targetPipelineId =
      request.params?.pipelineId || request.body?.pipelineId || request.query?.pipelineId;
    if (targetPipelineId && this.prisma.pipelineDefinition?.findFirst) {
      const pipeline = await this.prisma.pipelineDefinition.findFirst({
        where: { id: String(targetPipelineId), deletedAt: null },
        include: { project: true },
      });
      if (!pipeline) {
        throw new NotFoundException(`Pipeline '${targetPipelineId}' not found`);
      }
      orgIdOrSlug = pipeline.project.organizationId;
    }

    // 4. Run-scoped resolution
    const targetRunId =
      request.params?.runId ||
      request.body?.pipelineRunId ||
      request.query?.runId ||
      (request.route?.path?.includes('runs/:id') ? request.params?.id : null);
    if (targetRunId && this.prisma.pipelineRun?.findFirst) {
      const run = await this.prisma.pipelineRun.findFirst({
        where: { id: String(targetRunId), deletedAt: null },
        include: { pipelineDefinition: { include: { project: true } } },
      });
      if (!run) {
        throw new NotFoundException(`Pipeline Run '${targetRunId}' not found`);
      }
      orgIdOrSlug = run.pipelineDefinition.project.organizationId;
    }

    // 5. Deployment-scoped resolution
    const targetDeploymentId =
      request.params?.deploymentId ||
      request.body?.deploymentId ||
      request.query?.deploymentId ||
      (request.route?.path?.includes('deployments/:id') ? request.params?.id : null);
    if (targetDeploymentId && this.prisma.deployment?.findFirst) {
      const deployment = await this.prisma.deployment.findFirst({
        where: { id: String(targetDeploymentId) },
        include: { environment: { include: { project: true } } },
      });
      if (!deployment) {
        throw new NotFoundException(`Deployment '${targetDeploymentId}' not found`);
      }
      orgIdOrSlug = deployment.environment.project.organizationId;
    }

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
