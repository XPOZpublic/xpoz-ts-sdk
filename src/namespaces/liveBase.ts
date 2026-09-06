import { CursorResult } from "../cursor.js";
import type { RestTransport, QueryParams } from "../rest/transport.js";
import type { CursorPageResponse } from "../types/common.js";

const STRING_ID_FIELDS = [
  "id",
  "userId",
  "user_id",
  "postId",
  "post_id",
  "authorId",
  "author_id",
] as const;

function coerceStringIds<T>(item: T): T {
  const record = item as Record<string, unknown>;
  for (const field of STRING_ID_FIELDS) {
    if (typeof record[field] === "number") {
      record[field] = String(record[field]);
    }
  }
  return item;
}

export function csvFields(fields?: string[]): string | undefined {
  return fields && fields.length > 0 ? fields.join(",") : undefined;
}

export abstract class LiveNamespace {
  protected transport: RestTransport;

  constructor(transport: RestTransport) {
    this.transport = transport;
  }

  protected async page<T>(path: string, params: QueryParams): Promise<CursorResult<T>> {
    const payload = await this.transport.get<CursorPageResponse<T>>(path, params);

    return new CursorResult<T>({
      data: (payload.results ?? []).map(coerceStringIds),
      hasMore: Boolean(payload.has_more),
      nextPageCursor: payload.next_page_cursor ?? null,
      fetchPage: (cursor: string) => this.page<T>(path, { ...params, cursor }),
    });
  }

  protected async single<T>(path: string, params: QueryParams): Promise<T | null> {
    const page = await this.page<T>(path, params);
    return page.data[0] ?? null;
  }
}
