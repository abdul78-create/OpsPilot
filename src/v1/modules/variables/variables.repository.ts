import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EnvironmentVariable, Prisma } from '@prisma/client';

@Injectable()
export class VariablesRepository extends BaseRepository<
  EnvironmentVariable,
  Prisma.EnvironmentVariableCreateInput,
  Prisma.EnvironmentVariableUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'environmentVariable');
  }

  async findByEnvironmentAndKey(
    environmentId: string,
    key: string,
  ): Promise<EnvironmentVariable | null> {
    return this.prismaService.environmentVariable.findFirst({
      where: { environmentId, key, deletedAt: null },
    });
  }

  async findEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
    return this.prismaService.environmentVariable.findMany({
      where: { environmentId, deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }
}
