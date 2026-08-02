import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { RepositoryConnection, Prisma } from '@prisma/client';

@Injectable()
export class RepositoriesRepository extends BaseRepository<
  RepositoryConnection,
  Prisma.RepositoryConnectionCreateInput,
  Prisma.RepositoryConnectionUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'repositoryConnection');
  }

  async findByProjectAndUrl(
    projectId: string,
    repositoryUrl: string,
  ): Promise<RepositoryConnection | null> {
    return this.prismaService.repositoryConnection.findFirst({
      where: { projectId, repositoryUrl, deletedAt: null },
    });
  }

  async findProjectRepositories(projectId: string): Promise<RepositoryConnection[]> {
    return this.prismaService.repositoryConnection.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
}
