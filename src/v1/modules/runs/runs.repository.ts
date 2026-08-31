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

  async findPipelineRuns(
    pipelineDefinitionId: string,
  ): Promise<(PipelineRun & { repositoryUrl?: string | null })[]> {
    const runs = await this.prismaService.pipelineRun.findMany({
      where: { pipelineDefinitionId, deletedAt: null },
      orderBy: { queuedAt: 'desc' },
      include: {
        jobs: { orderBy: { createdAt: 'asc' } },
        pipelineDefinition: {
          include: {
            project: {
              include: {
                repositoryConnections: {
                  where: { deletedAt: null },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    return runs.map((r) => ({
      ...r,
      repositoryUrl:
        (
          r.pipelineDefinition as {
            project?: { repositoryConnections?: { repositoryUrl: string }[] };
          }
        )?.project?.repositoryConnections?.[0]?.repositoryUrl ?? null,
    }));
  }

  async findRunDetails(
    runId: string,
  ): Promise<(PipelineRun & { repositoryUrl?: string | null }) | null> {
    const run = await this.prismaService.pipelineRun.findFirst({
      where: { id: runId, deletedAt: null },
      include: {
        jobs: { orderBy: { createdAt: 'asc' } },
        pipelineDefinition: {
          include: {
            project: {
              include: {
                repositoryConnections: {
                  where: { deletedAt: null },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        pipelineVersion: true,
      },
    });

    if (!run) return null;

    return {
      ...run,
      repositoryUrl:
        (
          run.pipelineDefinition as {
            project?: { repositoryConnections?: { repositoryUrl: string }[] };
          }
        )?.project?.repositoryConnections?.[0]?.repositoryUrl ?? null,
    };
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
