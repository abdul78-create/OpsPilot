import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { ServiceLevelObjective, Prisma } from '@prisma/client';

@Injectable()
export class SloRepository extends BaseRepository<
  ServiceLevelObjective,
  Prisma.ServiceLevelObjectiveCreateInput,
  Prisma.ServiceLevelObjectiveUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'serviceLevelObjective');
  }

  override async findById(id: string): Promise<ServiceLevelObjective | null> {
    return this.prismaService.serviceLevelObjective.findUnique({
      where: { id },
    });
  }

  async findByOrganization(organizationId: string): Promise<ServiceLevelObjective[]> {
    return this.prismaService.serviceLevelObjective.findMany({
      where: { organizationId },
      orderBy: { service: 'asc' },
    });
  }

  async findByService(
    organizationId: string,
    service: string,
  ): Promise<ServiceLevelObjective | null> {
    return this.prismaService.serviceLevelObjective.findUnique({
      where: {
        organizationId_service: {
          organizationId,
          service,
        },
      },
    });
  }

  async delete(id: string): Promise<ServiceLevelObjective> {
    return this.prismaService.serviceLevelObjective.delete({
      where: { id },
    });
  }
}
