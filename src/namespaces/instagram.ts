import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import type { InstagramPost, InstagramUser, InstagramComment } from "../types/instagram.js";
import type { CursorPageResponse, PaginationInfo } from "../types/common.js";
import type { RestTransport } from "../rest/transport.js";
import { INSTAGRAM_ROUTES, INSTAGRAM_LIVE_ROUTES } from "../config/routes.js";
import { csvFields } from "./liveBase.js";
import * as tools from "../config/tools.js";
import { ResponseType } from "../config/constants.js";

type RawDict = Record<string, unknown>;

interface UserResponse {
  results: InstagramUser[];
  count: number;
}

function parsePost(item: RawDict): InstagramPost {
  return item as InstagramPost;
}

function parseUser(item: RawDict): InstagramUser {
  return item as InstagramUser;
}

function parseComment(item: RawDict): InstagramComment {
  return item as InstagramComment;
}

export class InstagramNamespace extends BaseNamespace {
  private rest: RestTransport;

  constructor(
    callTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>,
    timeoutMs: number,
    restTransport: RestTransport
  ) {
    super(callTool, timeoutMs);
    this.rest = restTransport;
  }

  private cursorToPaginatedResult<T>(
    response: CursorPageResponse<T>,
    fetchNext: (cursor: string) => Promise<CursorPageResponse<T>>,
    pageNumber: number = 1
  ): PaginatedResult<T> {
    const items = response.results ?? [];
    const hasMore = Boolean(response.has_more);
    const nextCursor = response.next_page_cursor ?? null;

    const pagination: PaginationInfo = {
      tableName: null,
      totalRows: 0,
      totalPages: hasMore ? pageNumber + 1 : pageNumber,
      pageNumber,
      pageSize: items.length,
      resultsCount: items.length,
    };

    const fetchPage = async (): Promise<PaginatedResult<T>> => {
      if (!nextCursor) {
        throw new RangeError("No more pages available");
      }
      const nextResponse = await fetchNext(nextCursor);
      return this.cursorToPaginatedResult(nextResponse, fetchNext, pageNumber + 1);
    };

    return new PaginatedResult<T>({
      data: items,
      pagination,
      tableName: null,
      exportOperationId: null,
      fetchPage: () => fetchPage(),
      fetchExport: null,
    });
  }

  async getPostsByIds(
    postIds: string[],
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<InstagramPost[]> {
    const args = this.buildArgs({ postIds, ...options });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_POSTS_BY_IDS, args);
    return ((result["results"] as RawDict[]) ?? []).map(parsePost);
  }

  async getPostsByUser(
    identifier: string,
    options: {
      identifierType?: string;
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<InstagramPost>> {
    const args = this.buildArgs({
      identifier,
      identifierType: options.identifierType ?? "username",
      fields: options.fields,
      startDate: options.startDate,
      endDate: options.endDate,
      forceLatest: options.forceLatest,
      responseType: options.responseType,
      limit: options.limit,
    });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_POSTS_BY_USER, args);
    return this.buildPaginatedResult(
      result,
      parsePost,
      tools.GET_INSTAGRAM_POSTS_BY_USER,
      args
    );
  }

  async searchPosts(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<InstagramPost>> {
    const args = this.buildArgs({
      query,
      fields: options.fields,
      startDate: options.startDate,
      endDate: options.endDate,
      forceLatest: options.forceLatest,
      responseType: options.responseType,
      limit: options.limit,
    });
    const result = await this.callAndMaybePoll(tools.SEARCH_INSTAGRAM_POSTS, args);
    return this.buildPaginatedResult(result, parsePost, tools.SEARCH_INSTAGRAM_POSTS, args);
  }

  async getComments(
    postId: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
    } = {}
  ): Promise<PaginatedResult<InstagramComment>> {
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_COMMENTS, args);
    return this.buildPaginatedResult(result, parseComment, tools.GET_INSTAGRAM_COMMENTS, args);
  }

  async getUser(
    identifier: string,
    options: { identifierType?: string; fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<InstagramUser> {
    const response = await this.rest.get<UserResponse>(
      INSTAGRAM_ROUTES.user(identifier),
      {
        identifierType: options.identifierType ?? "username",
        fields: csvFields(options.fields),
        forceLatest: true,
      }
    );
    if (response.results.length > 0) {
      return response.results[0];
    }
    throw new Error(`User not found: ${identifier}`);
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<InstagramUser[]> {
    const response = await this.rest.get<UserResponse>(
      INSTAGRAM_LIVE_ROUTES.users,
      {
        name,
        fields: csvFields(options.fields),
      }
    );
    const users = response.results ?? [];
    if (options.limit && options.limit > 0) {
      return users.slice(0, options.limit);
    }
    return users;
  }

  async getUserConnections(
    username: string,
    connectionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<InstagramUser>> {
    const params = {
      connectionType,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<InstagramUser>>(
      INSTAGRAM_LIVE_ROUTES.userConnections(username),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<InstagramUser>>(
        INSTAGRAM_LIVE_ROUTES.userConnections(username),
        { ...params, cursor }
      )
    );
  }

  async getPostInteractingUsers(
    postId: string,
    interactionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<InstagramUser>> {
    const params = {
      interactionType,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<InstagramUser>>(
      INSTAGRAM_LIVE_ROUTES.postInteractingUsers(postId),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<InstagramUser>>(
        INSTAGRAM_LIVE_ROUTES.postInteractingUsers(postId),
        { ...params, cursor }
      )
    );
  }

  async getUsersByKeywords(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<InstagramUser>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_USERS_BY_KEYWORDS, args);
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_INSTAGRAM_USERS_BY_KEYWORDS,
      args
    );
  }
}
