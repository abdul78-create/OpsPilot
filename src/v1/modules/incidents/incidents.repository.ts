import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Incident, Prisma } from '@prisma/client';

@Injectable()
export class IncidentsRepository extends BaseRepository<
  Incident,
  Prisma.IncidentCreateInput,
  Prisma.IncidentUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'incident');
  }

  override async findById(id: string): Promise<Incident | null> {
    return this.prismaService.incident.findUnique({
      where: { id },
    });
  }

  async findByOrganization(organizationId: string, status?: string): Promise<Incident[]> {
    const where: Prisma.IncidentWhereInput = { organizationId };
    if (status) {
      where.status = status as Prisma.EnumIncidentStatusFilter['equals'];
    }
    return this.prismaService.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByService(organizationId: string, service: string): Promise<Incident[]> {
    return this.prismaService.incident.findMany({
      where: { organizationId, service },
      orderBy: { createdAt: 'desc' },
    });
  }
}
