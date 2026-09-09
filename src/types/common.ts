export interface CursorPageResponse<T> {
  results: T[];
  count: number;
  dataSource?: string;
  has_more: boolean;
  next_page_cursor: string | null;
}

export type InstagramConnectionType = "followers" | "following";
export type InstagramInteractionType = "commenters" | "likers";

export type TwitterConnectionType = "followers" | "following";
export type TwitterInteractionType = "commenters" | "quoters" | "retweeters";
export type TwitterLiveSortBy = "relevance" | "latest";

export interface PaginationInfo {
  tableName?: string | null;
  totalRows: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  resultsCount: number;
}
