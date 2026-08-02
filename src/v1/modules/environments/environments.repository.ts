import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Environment, Prisma } from '@prisma/client';

@Injectable()
export class EnvironmentsRepository extends BaseRepository<
  Environment,
  Prisma.EnvironmentCreateInput,
  Prisma.EnvironmentUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'environment');
  }

  async findByProjectAndSlug(projectId: string, slug: string): Promise<Environment | null> {
    return this.prismaService.environment.findFirst({
      where: { projectId, slug, deletedAt: null },
    });
  }

  async findProjectEnvironments(projectId: string): Promise<Environment[]> {
    return this.prismaService.environment.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
}
