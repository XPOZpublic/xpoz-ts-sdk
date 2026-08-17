type FetchPage<T> = (cursor: string) => Promise<CursorResult<T>>;

export class CursorResult<T> {
  data: T[];
  hasMore: boolean;
  nextPageCursor: string | null;
  private _fetchPage: FetchPage<T>;

  constructor(options: {
    data: T[];
    hasMore: boolean;
    nextPageCursor: string | null;
    fetchPage: FetchPage<T>;
  }) {
    this.data = options.data;
    this.hasMore = options.hasMore;
    this.nextPageCursor = options.nextPageCursor;
    this._fetchPage = options.fetchPage;
  }

  hasNextPage(): boolean {
    return this.hasMore && this.nextPageCursor !== null;
  }

  async nextPage(): Promise<CursorResult<T>> {
    if (!this.hasNextPage()) {
      throw new RangeError("No more pages available");
    }
    return this._fetchPage(this.nextPageCursor as string);
  }

  async *pages(): AsyncGenerator<CursorResult<T>> {
    let page: CursorResult<T> = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.nextPage();
      yield page;
    }
  }

  async *items(): AsyncGenerator<T> {
    for await (const page of this.pages()) {
      yield* page.data;
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }
}
