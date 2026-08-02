import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { PipelineRunLog, Prisma, LogLevel } from '@prisma/client';

@Injectable()
export class LogsRepository extends BaseRepository<
  PipelineRunLog,
  Prisma.PipelineRunLogCreateInput,
  Prisma.PipelineRunLogUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'pipelineRunLog');
  }

  async appendLog(
    pipelineRunId: string,
    level: LogLevel,
    message: string,
    jobId?: string,
  ): Promise<PipelineRunLog> {
    return this.prismaService.pipelineRunLog.create({
      data: {
        pipelineRun: { connect: { id: pipelineRunId } },
        ...(jobId ? { job: { connect: { id: jobId } } } : {}),
        level,
        message,
        timestamp: new Date(),
      },
    });
  }

  async findByRun(pipelineRunId: string): Promise<PipelineRunLog[]> {
    return this.prismaService.pipelineRunLog.findMany({
      where: { pipelineRunId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
