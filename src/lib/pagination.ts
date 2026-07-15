/**
 * KaziFlow — pagination helpers
 * ------------------------------------------------------------------
 * Simple offset-based pagination for API list endpoints.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function getPagination(params: PaginationParams = {}): { page: number; limit: number; offset: number } {
  const maxLimit = params.maxLimit ?? 100;
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(maxLimit, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse<T>(result: PaginatedResult<T>): Response {
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
