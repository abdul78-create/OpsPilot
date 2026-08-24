import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogsRepository, PaginatedAuditLogs } from './audit-logs.repository';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditLog, AuditAction } from '@prisma/client';

export { PaginatedAuditLogs };

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepo: AuditLogsRepository) {}

  async query(organizationId: string, dto: QueryAuditLogsDto): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, parseInt(dto.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(dto.limit ?? '50', 10)));

    return this.auditLogsRepo.findPaginated(organizationId, {
      userId: dto.userId,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
      page,
      limit,
    });
  }

  async getById(organizationId: string, id: string): Promise<AuditLog> {
    const log = await this.auditLogsRepo.findById(id);
    if (!log || log.organizationId !== organizationId) {
      throw new NotFoundException(`Audit log '${id}' not found.`);
    }
    return log;
  }

  /**
   * Programmatic write for internal events (AI actions, automated pipelines, etc.)
   */
  async write(data: {
    organizationId?: string;
    userId?: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    payload?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.auditLogsRepo.writeLog(data);
  }
}
