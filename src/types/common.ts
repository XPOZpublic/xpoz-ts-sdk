export interface PaginationInfo {
  tableName?: string | null;
  totalRows: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  resultsCount: number;
}
