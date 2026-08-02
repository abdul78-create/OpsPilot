import { Injectable } from '@nestjs/common';
import { ObservabilityRepository } from '../observability.repository';
import { AuditLog } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private readonly observabilityRepository: ObservabilityRepository) {}

  async findOrganizationAuditLogs(
    organizationId: string,
    filters?: {
      action?: string;
      resourceType?: string;
      userId?: string;
    },
  ): Promise<AuditLog[]> {
    return this.observabilityRepository.findOrganizationAuditLogs(organizationId, filters);
  }
}
