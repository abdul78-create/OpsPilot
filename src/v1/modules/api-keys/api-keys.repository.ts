import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { ApiKey, Prisma } from '@prisma/client';

@Injectable()
export class ApiKeysRepository extends BaseRepository<
  ApiKey,
  Prisma.ApiKeyCreateInput,
  Prisma.ApiKeyUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'apiKey');
  }

  override async findById(id: string): Promise<ApiKey | null> {
    return this.prismaService.apiKey.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.prismaService.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: { select: { id: true, email: true, name: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findByOrganization(organizationId: string): Promise<ApiKey[]> {
    return this.prismaService.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }
}
