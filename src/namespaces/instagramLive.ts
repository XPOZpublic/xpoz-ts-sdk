import { CursorResult } from "../cursor.js";
import { INSTAGRAM_LIVE_ROUTES } from "../config/routes.js";
import type { RestTransport, QueryParams } from "../rest/transport.js";
import type {
  CursorPageResponse,
  InstagramConnectionType,
  InstagramInteractionType,
} from "../types/common.js";
import type { InstagramComment, InstagramPost, InstagramUser } from "../types/instagram.js";

const STRING_ID_FIELDS = ["id", "userId", "user_id", "postId", "post_id"] as const;

function coerceStringIds<T>(item: T): T {
  const record = item as Record<string, unknown>;
  for (const field of STRING_ID_FIELDS) {
    if (typeof record[field] === "number") {
      record[field] = String(record[field]);
    }
  }
  return item;
}

function csvFields(fields?: string[]): string | undefined {
  return fields && fields.length > 0 ? fields.join(",") : undefined;
}

export class InstagramLiveNamespace {
  private transport: RestTransport;

  constructor(transport: RestTransport) {
    this.transport = transport;
  }

  private async page<T>(path: string, params: QueryParams): Promise<CursorResult<T>> {
    const payload = await this.transport.get<CursorPageResponse<T>>(path, params);

    return new CursorResult<T>({
      data: (payload.results ?? []).map(coerceStringIds),
      hasMore: Boolean(payload.has_more),
      nextPageCursor: payload.next_page_cursor ?? null,
      fetchPage: (cursor: string) => this.page<T>(path, { ...params, cursor }),
    });
  }

  private async single<T>(path: string, params: QueryParams): Promise<T | null> {
    const page = await this.page<T>(path, params);
    return page.data[0] ?? null;
  }

  async searchPosts(
    query: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<InstagramPost>> {
    return this.page<InstagramPost>(INSTAGRAM_LIVE_ROUTES.posts, {
      q: query,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getPostsByUser(
    identifier: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<InstagramPost>> {
    return this.page<InstagramPost>(INSTAGRAM_LIVE_ROUTES.userPosts(identifier), {
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getPost(
    postId: string,
    options: { fields?: string[] } = {}
  ): Promise<InstagramPost | null> {
    return this.single<InstagramPost>(INSTAGRAM_LIVE_ROUTES.post(postId), {
      fields: csvFields(options.fields),
    });
  }

  async getComments(
    postId: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<InstagramComment>> {
    return this.page<InstagramComment>(INSTAGRAM_LIVE_ROUTES.postComments(postId), {
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getPostInteractingUsers(
    postId: string,
    interactionType: InstagramInteractionType,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<InstagramUser>> {
    return this.page<InstagramUser>(INSTAGRAM_LIVE_ROUTES.postInteractingUsers(postId), {
      interactionType,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async searchUsers(
    name: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<InstagramUser>> {
    return this.page<InstagramUser>(INSTAGRAM_LIVE_ROUTES.users, {
      name,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getUser(
    identifier: string,
    options: { fields?: string[] } = {}
  ): Promise<InstagramUser | null> {
    return this.single<InstagramUser>(INSTAGRAM_LIVE_ROUTES.user(identifier), {
      fields: csvFields(options.fields),
    });
  }

  async getUserConnections(
    identifier: string,
    connectionType: InstagramConnectionType,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<InstagramUser>> {
    return this.page<InstagramUser>(INSTAGRAM_LIVE_ROUTES.userConnections(identifier), {
      connectionType,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }
}
