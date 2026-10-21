import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import type { TiktokPost, TiktokUser, TiktokComment, TiktokSound } from "../types/tiktok.js";
import type { CursorPageResponse, PaginationInfo } from "../types/common.js";
import type { RestTransport } from "../rest/transport.js";
import { TIKTOK_LIVE_ROUTES } from "../config/routes.js";
import { csvFields } from "./liveBase.js";
import * as tools from "../config/tools.js";
import { ResponseType } from "../config/constants.js";

type RawDict = Record<string, unknown>;

function parsePost(item: RawDict): TiktokPost {
  return item as TiktokPost;
}

function parseUser(item: RawDict): TiktokUser {
  return item as TiktokUser;
}

function parseComment(item: RawDict): TiktokComment {
  return item as TiktokComment;
}

function parseSound(item: RawDict): TiktokSound {
  return item as TiktokSound;
}

export class TiktokNamespace extends BaseNamespace {
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
  ): Promise<TiktokPost[]> {
    const args = this.buildArgs({ postIds, ...options });
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_POSTS_BY_IDS, args);
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
  ): Promise<PaginatedResult<TiktokPost>> {
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({
        identifier, identifierType: options.identifierType ?? "username",
        fields: options.fields, startDate: options.startDate, endDate: options.endDate,
        forceLatest: options.forceLatest, responseType: options.responseType, limit: options.limit,
      });
      const result = await this.callAndMaybePoll(tools.GET_TIKTOK_POSTS_BY_USER, args);
      return this.buildPaginatedResult(result, parsePost, tools.GET_TIKTOK_POSTS_BY_USER, args);
    }

    const params = { fields: csvFields(options.fields) };
    const response = await this.rest.get<CursorPageResponse<TiktokPost>>(
      TIKTOK_LIVE_ROUTES.userPosts(identifier), params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TiktokPost>>(
        TIKTOK_LIVE_ROUTES.userPosts(identifier), { ...params, cursor }
      )
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
  ): Promise<PaginatedResult<TiktokPost>> {
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({
        query, fields: options.fields, startDate: options.startDate, endDate: options.endDate,
        forceLatest: options.forceLatest, responseType: options.responseType, limit: options.limit,
      });
      const result = await this.callAndMaybePoll(tools.SEARCH_TIKTOK_POSTS, args);
      return this.buildPaginatedResult(result, parsePost, tools.SEARCH_TIKTOK_POSTS, args);
    }

    const params = { q: query, fields: csvFields(options.fields) };
    const response = await this.rest.get<CursorPageResponse<TiktokPost>>(
      TIKTOK_LIVE_ROUTES.posts, params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TiktokPost>>(
        TIKTOK_LIVE_ROUTES.posts, { ...params, cursor }
      )
    );
  }

  async getComments(
    postId: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
    } = {}
  ): Promise<PaginatedResult<TiktokComment>> {
    const params = { fields: csvFields(options.fields) };
    const response = await this.rest.get<CursorPageResponse<TiktokComment>>(
      TIKTOK_LIVE_ROUTES.postComments(postId), params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TiktokComment>>(
        TIKTOK_LIVE_ROUTES.postComments(postId), { ...params, cursor }
      )
    );
  }

  async getUser(
    identifier: string,
    options: { identifierType?: string; fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<TiktokUser> {
    if ((options.identifierType ?? "username") === "id") {
      const args = this.buildArgs({
        identifier, identifierType: "id", fields: options.fields, forceLatest: options.forceLatest,
      });
      const result = await this.callAndMaybePoll(tools.GET_TIKTOK_USER, args);
      const results = result["results"];
      if (Array.isArray(results) && results.length > 0) {
        return results[0] as TiktokUser;
      }
      return result as TiktokUser;
    }

    const response = await this.rest.get<CursorPageResponse<TiktokUser>>(
      TIKTOK_LIVE_ROUTES.user(identifier), { fields: csvFields(options.fields) }
    );
    if (response.results && response.results.length > 0) {
      return response.results[0];
    }
    throw new Error(`User not found: ${identifier}`);
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<TiktokUser[]> {
    const response = await this.rest.get<CursorPageResponse<TiktokUser>>(
      TIKTOK_LIVE_ROUTES.users,
      { name, fields: csvFields(options.fields) }
    );
    const users = response.results ?? [];
    if (options.limit && options.limit > 0) {
      return users.slice(0, options.limit);
    }
    return users;
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
  ): Promise<PaginatedResult<TiktokUser>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_USERS_BY_KEYWORDS, args);
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_TIKTOK_USERS_BY_KEYWORDS,
      args
    );
  }

  async getPostsByHashtags(
    hashtags: string[],
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TiktokPost>> {
    const args = this.buildArgs({ hashtags, ...options });
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_POSTS_BY_HASHTAGS, args);
    return this.buildPaginatedResult(
      result,
      parsePost,
      tools.GET_TIKTOK_POSTS_BY_HASHTAGS,
      args
    );
  }

  async getUsersByHashtags(
    hashtags: string[],
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TiktokUser>> {
    const args = this.buildArgs({ hashtags, ...options });
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_USERS_BY_HASHTAGS, args);
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_TIKTOK_USERS_BY_HASHTAGS,
      args
    );
  }

  async searchSounds(
    keyword: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<TiktokSound[]> {
    const response = await this.rest.get<CursorPageResponse<TiktokSound>>(
      TIKTOK_LIVE_ROUTES.sounds,
      { keyword, fields: csvFields(options.fields) }
    );
    const sounds = response.results ?? [];
    if (options.limit && options.limit > 0) {
      return sounds.slice(0, options.limit);
    }
    return sounds;
  }

  async getPostsBySound(
    soundId: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TiktokPost>> {
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({ soundId, ...options });
      const result = await this.callAndMaybePoll(tools.GET_TIKTOK_POSTS_BY_SOUND, args);
      return this.buildPaginatedResult(result, parsePost, tools.GET_TIKTOK_POSTS_BY_SOUND, args);
    }

    const params = { fields: csvFields(options.fields) };
    const response = await this.rest.get<CursorPageResponse<TiktokPost>>(
      TIKTOK_LIVE_ROUTES.postsBySound(soundId), params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TiktokPost>>(
        TIKTOK_LIVE_ROUTES.postsBySound(soundId), { ...params, cursor }
      )
    );
  }
}
