import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuditLog, AuditAction, Prisma } from '@prisma/client';

export interface PaginatedAuditLogs {
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(id: string): Promise<AuditLog | null> {
    return this.prismaService.auditLog.findUnique({ where: { id } });
  }

  async findPaginated(
    organizationId: string,
    filters: {
      userId?: string;
      action?: AuditAction;
      resourceType?: string;
      resourceId?: string;
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    },
  ): Promise<PaginatedAuditLogs> {
    const skip = (filters.page - 1) * filters.limit;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(filters.resourceId && { resourceId: filters.resourceId }),
      ...((filters.from || filters.to) && {
        createdAt: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to && { lte: filters.to }),
        },
      }),
    };

    const [totalItems, data] = await Promise.all([
      this.prismaService.auditLog.count({ where }),
      this.prismaService.auditLog.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / filters.limit) || 1;

    return {
      data,
      meta: {
        page: filters.page,
        limit: filters.limit,
        totalItems,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
      },
    };
  }

  async writeLog(data: {
    organizationId?: string;
    userId?: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    payload?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.prismaService.auditLog.create({
      data: {
        organizationId: data.organizationId ?? null,
        userId: data.userId ?? null,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId ?? null,
        payload: data.payload ? (data.payload as Prisma.InputJsonValue) : undefined,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }
}
