import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextService } from '../context/request-context.service';
import { PrismaService } from '../database/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly contextService: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const method = req.method;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const store = this.contextService.getStore();
    const userId = store?.userId;
    const organizationId = store?.tenantId;
    const url = req.url || '';

    const action = this.mapMethodToAction(method, url);
    const resourceType = this.extractResourceType(url);

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.prisma.auditLog.create({
            data: {
              organizationId: organizationId || null,
              userId: userId || null,
              action,
              resourceType,
              resourceId: req.params?.id || req.params?.projectId || null,
              payload: req.body ? JSON.parse(JSON.stringify(req.body)) : null,
              ipAddress: store?.ipAddress || req.ip || null,
              userAgent: req.headers?.['user-agent'] || null,
            },
          });
        } catch {
          // Fire-and-forget: do not block response cycle if audit write fails
        }
      }),
    );
  }

  private mapMethodToAction(method: string, url: string): AuditAction {
    if (url.includes('/approve')) return AuditAction.APPROVE;
    if (url.includes('/reject')) return AuditAction.REJECT;
    if (url.includes('/rotate')) return AuditAction.ROTATE;
    if (url.includes('/reveal')) return AuditAction.REVEAL;
    if (url.includes('/rollback')) return AuditAction.ROLLBACK;

    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PATCH':
      case 'PUT':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.EXECUTE;
    }
  }

  private extractResourceType(url: string): string {
    if (url.includes('/organizations')) return 'Organization';
    if (url.includes('/projects')) return 'Project';
    if (url.includes('/environments')) return 'Environment';
    if (url.includes('/variables')) return 'EnvironmentVariable';
    if (url.includes('/secrets')) return 'Secret';
    if (url.includes('/repositories')) return 'RepositoryConnection';
    if (url.includes('/pipelines')) return 'PipelineDefinition';
    if (url.includes('/runs')) return 'PipelineRun';
    if (url.includes('/deployments')) return 'Deployment';
    return 'SystemResource';
  }
}
