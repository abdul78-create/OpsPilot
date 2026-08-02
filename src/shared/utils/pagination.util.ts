export interface PaginationQueryParams {
  page?: number;
  limit?: number;
}

export function parsePaginationParams(query: PaginationQueryParams) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}
