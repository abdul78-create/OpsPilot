import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { AiAnalysisReport, Prisma } from '@prisma/client';

@Injectable()
export class AiOrchestrationRepository extends BaseRepository<
  AiAnalysisReport,
  Prisma.AiAnalysisReportCreateInput,
  Prisma.AiAnalysisReportUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'aiAnalysisReport');
  }

  override async findById(id: string): Promise<AiAnalysisReport | null> {
    return this.prismaService.aiAnalysisReport.findUnique({
      where: { id },
    });
  }

  async findByOrganization(organizationId: string, type?: string): Promise<AiAnalysisReport[]> {
    const where: Prisma.AiAnalysisReportWhereInput = { organizationId };
    if (type) {
      where.type = type as Prisma.EnumAiAnalysisTypeFilter['equals'];
    }
    return this.prismaService.aiAnalysisReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTargetId(targetId: string): Promise<AiAnalysisReport[]> {
    return this.prismaService.aiAnalysisReport.findMany({
      where: { targetId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
