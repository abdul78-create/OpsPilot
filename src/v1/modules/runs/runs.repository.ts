import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { PipelineRun, PipelineJob, Prisma } from '@prisma/client';

@Injectable()
export class RunsRepository extends BaseRepository<
  PipelineRun,
  Prisma.PipelineRunCreateInput,
  Prisma.PipelineRunUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'pipelineRun');
  }

  async findPipelineRuns(pipelineDefinitionId: string): Promise<PipelineRun[]> {
    return this.prismaService.pipelineRun.findMany({
      where: { pipelineDefinitionId, deletedAt: null },
      orderBy: { queuedAt: 'desc' },
      include: {
        jobs: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findRunDetails(runId: string): Promise<PipelineRun | null> {
    return this.prismaService.pipelineRun.findFirst({
      where: { id: runId, deletedAt: null },
      include: {
        jobs: { orderBy: { createdAt: 'asc' } },
        pipelineDefinition: true,
        pipelineVersion: true,
      },
    });
  }

  async createJob(data: Prisma.PipelineJobCreateInput): Promise<PipelineJob> {
    return this.prismaService.pipelineJob.create({ data });
  }

  async updateJob(id: string, data: Prisma.PipelineJobUpdateInput): Promise<PipelineJob> {
    return this.prismaService.pipelineJob.update({
      where: { id },
      data,
    });
  }
}
