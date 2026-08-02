import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Project, Prisma } from '@prisma/client';

@Injectable()
export class ProjectsRepository extends BaseRepository<
  Project,
  Prisma.ProjectCreateInput,
  Prisma.ProjectUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'project');
  }

  async findByOrganizationAndSlug(organizationId: string, slug: string): Promise<Project | null> {
    return this.prismaService.project.findFirst({
      where: { organizationId, slug, deletedAt: null },
    });
  }

  async findOrganizationProjects(organizationId: string): Promise<Project[]> {
    return this.prismaService.project.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
