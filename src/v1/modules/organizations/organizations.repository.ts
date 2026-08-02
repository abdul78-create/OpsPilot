import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Organization, Prisma } from '@prisma/client';

@Injectable()
export class OrganizationsRepository extends BaseRepository<
  Organization,
  Prisma.OrganizationCreateInput,
  Prisma.OrganizationUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'organization');
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prismaService.organization.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findUserOrganizations(userId: string): Promise<Organization[]> {
    return this.prismaService.organization.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId,
            deletedAt: null,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
