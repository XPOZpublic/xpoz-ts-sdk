import type { PaginationInfo } from "./types/common.js";

type FetchPage<T> = (pageNumber: number, tableName: string | null | undefined) => Promise<PaginatedResult<T>>;
type FetchExport = (exportOperationId: string) => Promise<string>;

export class PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
  private _tableName: string | null | undefined;
  private _exportOperationId: string | null | undefined;
  private _fetchPage: FetchPage<T>;
  private _fetchExport: FetchExport | null;

  constructor(options: {
    data: T[];
    pagination: PaginationInfo;
    tableName: string | null | undefined;
    exportOperationId: string | null | undefined;
    fetchPage: FetchPage<T>;
    fetchExport: FetchExport | null;
  }) {
    this.data = options.data;
    this.pagination = options.pagination;
    this._tableName = options.tableName;
    this._exportOperationId = options.exportOperationId;
    this._fetchPage = options.fetchPage;
    this._fetchExport = options.fetchExport;
  }

  hasNextPage(): boolean {
    return this.pagination.pageNumber < this.pagination.totalPages;
  }

  async nextPage(): Promise<PaginatedResult<T>> {
    if (!this.hasNextPage()) {
      throw new RangeError("No more pages available");
    }
    return this._fetchPageResult(this.pagination.pageNumber + 1);
  }

  async getPage(pageNumber: number): Promise<PaginatedResult<T>> {
    if (pageNumber < 1 || pageNumber > this.pagination.totalPages) {
      throw new RangeError(
        `Page ${pageNumber} out of range (1-${this.pagination.totalPages})`
      );
    }
    return this._fetchPageResult(pageNumber);
  }

  async exportCsv(): Promise<string> {
    if (!this._fetchExport || !this._exportOperationId) {
      throw new Error("CSV export not available for this result");
    }
    return this._fetchExport(this._exportOperationId);
  }

  private _fetchPageResult(pageNumber: number): Promise<PaginatedResult<T>> {
    return this._fetchPage(pageNumber, this._tableName);
  }

  toString(): string {
    return `PaginatedResult(items=${this.data.length}, page=${this.pagination.pageNumber}/${this.pagination.totalPages}, total=${this.pagination.totalRows})`;
  }
}
