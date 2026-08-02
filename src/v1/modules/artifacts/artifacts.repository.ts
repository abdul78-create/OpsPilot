import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Artifact, Prisma } from '@prisma/client';

@Injectable()
export class ArtifactsRepository extends BaseRepository<
  Artifact,
  Prisma.ArtifactCreateInput,
  Prisma.ArtifactUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'artifact');
  }

  async findByPipelineRun(pipelineRunId: string): Promise<Artifact[]> {
    return this.prismaService.artifact.findMany({
      where: { pipelineRunId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneById(id: string): Promise<Artifact | null> {
    return this.prismaService.artifact.findFirst({
      where: { id, deletedAt: null },
      include: { pipelineRun: true },
    });
  }
}
