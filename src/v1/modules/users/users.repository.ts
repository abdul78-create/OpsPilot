import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'user');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prismaService.user.findMany({
      where: { deletedAt: null },
    });
  }

  async delete(id: string): Promise<User> {
    return this.softDelete(id);
  }
}
