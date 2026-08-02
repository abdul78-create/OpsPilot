import { PrismaService } from './prisma.service';

export interface OffsetPaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface OffsetPaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export abstract class BaseRepository<TModel, TCreateInput, TUpdateInput> {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model(): Record<string, (...args: unknown[]) => Promise<unknown>> {
    const serviceInstance = this.prismaService as unknown as Record<
      string,
      Record<string, (...args: unknown[]) => Promise<unknown>>
    >;
    return serviceInstance[this.modelName];
  }

  async findById(id: string): Promise<TModel | null> {
    const result = await this.model.findFirst({
      where: { id, deletedAt: null },
    });
    return (result as TModel) || null;
  }

  async findManyPaginated(
    where: Record<string, unknown> = {},
    options: OffsetPaginationOptions = {},
  ): Promise<OffsetPaginatedResult<TModel>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const queryWhere = { ...where, deletedAt: null };

    const [totalItems, data] = await Promise.all([
      this.model.count({ where: queryWhere }) as Promise<number>,
      this.model.findMany({
        where: queryWhere,
        skip,
        take: limit,
        orderBy: options.orderBy || { createdAt: 'desc' },
      }) as Promise<TModel[]>,
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async create(data: TCreateInput): Promise<TModel> {
    const result = await this.model.create({ data });
    return result as TModel;
  }

  async update(id: string, data: TUpdateInput): Promise<TModel> {
    const result = await this.model.update({
      where: { id },
      data,
    });
    return result as TModel;
  }

  async softDelete(id: string): Promise<TModel> {
    const result = await this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return result as TModel;
  }
}
