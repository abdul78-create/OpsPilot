import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Secret, Prisma } from '@prisma/client';

@Injectable()
export class SecretsRepository extends BaseRepository<
  Secret,
  Prisma.SecretCreateInput,
  Prisma.SecretUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'secret');
  }

  async findByEnvironmentAndKey(environmentId: string, key: string): Promise<Secret | null> {
    return this.prismaService.secret.findFirst({
      where: { environmentId, key, deletedAt: null },
    });
  }

  async findEnvironmentSecrets(environmentId: string): Promise<Secret[]> {
    return this.prismaService.secret.findMany({
      where: { environmentId, deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }
}
