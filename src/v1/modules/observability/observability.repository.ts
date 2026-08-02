import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuditLog, Prisma, AuditAction } from '@prisma/client';

@Injectable()
export class ObservabilityRepository extends BaseRepository<
  AuditLog,
  Prisma.AuditLogCreateInput,
  Prisma.AuditLogUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'auditLog');
  }

  async findOrganizationAuditLogs(
    organizationId: string,
    filters?: {
      action?: string;
      resourceType?: string;
      userId?: string;
    },
  ): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
    };

    if (filters?.action) {
      where.action = filters.action as AuditAction;
    }
    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return this.prismaService.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
