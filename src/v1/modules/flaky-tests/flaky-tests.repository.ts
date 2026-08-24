import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { FlakyTestRecord, Prisma } from '@prisma/client';

@Injectable()
export class FlakyTestsRepository extends BaseRepository<
  FlakyTestRecord,
  Prisma.FlakyTestRecordCreateInput,
  Prisma.FlakyTestRecordUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'flakyTestRecord');
  }

  override async findById(id: string): Promise<FlakyTestRecord | null> {
    return this.prismaService.flakyTestRecord.findUnique({
      where: { id },
    });
  }

  async findByOrganization(organizationId: string): Promise<FlakyTestRecord[]> {
    return this.prismaService.flakyTestRecord.findMany({
      where: { organizationId },
      orderBy: { flakinessScore: 'desc' },
    });
  }

  async findByProject(projectId: string): Promise<FlakyTestRecord[]> {
    return this.prismaService.flakyTestRecord.findMany({
      where: { projectId },
      orderBy: { flakinessScore: 'desc' },
    });
  }

  async findByTest(
    projectId: string,
    testSuite: string,
    testName: string,
  ): Promise<FlakyTestRecord | null> {
    return this.prismaService.flakyTestRecord.findUnique({
      where: {
        projectId_testSuite_testName: {
          projectId,
          testSuite,
          testName,
        },
      },
    });
  }

  async findQuarantinedByProject(projectId: string): Promise<FlakyTestRecord[]> {
    return this.prismaService.flakyTestRecord.findMany({
      where: {
        projectId,
        isQuarantined: true,
      },
    });
  }
}
