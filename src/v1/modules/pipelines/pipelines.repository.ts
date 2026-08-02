import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { PipelineDefinition, PipelineVersion, Prisma } from '@prisma/client';

@Injectable()
export class PipelinesRepository extends BaseRepository<
  PipelineDefinition,
  Prisma.PipelineDefinitionCreateInput,
  Prisma.PipelineDefinitionUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'pipelineDefinition');
  }

  async findByProjectAndSlug(projectId: string, slug: string): Promise<PipelineDefinition | null> {
    return this.prismaService.pipelineDefinition.findFirst({
      where: { projectId, slug, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findProjectPipelines(projectId: string): Promise<PipelineDefinition[]> {
    return this.prismaService.pipelineDefinition.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
  }

  async createVersion(data: Prisma.PipelineVersionCreateInput): Promise<PipelineVersion> {
    return this.prismaService.pipelineVersion.create({ data });
  }

  async findVersions(pipelineDefinitionId: string): Promise<PipelineVersion[]> {
    return this.prismaService.pipelineVersion.findMany({
      where: { pipelineDefinitionId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findVersionByNumber(
    pipelineDefinitionId: string,
    versionNumber: number,
  ): Promise<PipelineVersion | null> {
    return this.prismaService.pipelineVersion.findUnique({
      where: {
        pipelineDefinitionId_versionNumber: {
          pipelineDefinitionId,
          versionNumber,
        },
      },
    });
  }
}
