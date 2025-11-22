/**
 * Generic paginated response wrapper shared across modules.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export type PaginatedQueryOptions<TSortBy extends string> = {
  page?: number;
  limit?: number;
  sortBy?: TSortBy;
  sortOrder?: 'asc' | 'desc';
  filter?: string;
};
