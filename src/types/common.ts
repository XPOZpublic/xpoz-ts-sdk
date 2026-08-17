export interface CursorPageResponse<T> {
  results: T[];
  count: number;
  dataSource?: string;
  has_more: boolean;
  next_page_cursor: string | null;
}

export type InstagramConnectionType = "followers" | "following";
export type InstagramInteractionType = "commenters" | "likers";

export interface PaginationInfo {
  tableName?: string | null;
  totalRows: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  resultsCount: number;
}
