import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import type { TwitterPost, TwitterUser } from "../types/twitter.js";
import type { CursorPageResponse, PaginationInfo } from "../types/common.js";
import type { RestTransport } from "../rest/transport.js";
import { TWITTER_LIVE_ROUTES } from "../config/routes.js";
import { csvFields } from "./liveBase.js";
import { parallelMap } from "../concurrency.js";
import * as tools from "../config/tools.js";
import { ResponseType } from "../config/constants.js";

type RawDict = Record<string, unknown>;

function parseTwitterPost(item: RawDict): TwitterPost {
  return item as TwitterPost;
}

function parseUser(item: RawDict): TwitterUser {
  return item as TwitterUser;
}

export class TwitterNamespace extends BaseNamespace {
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
  ): Promise<TwitterPost[]> {
    const fieldsCsv = csvFields(options.fields);
    const results = await parallelMap(postIds, async (postId) => {
      const response = await this.rest.get<CursorPageResponse<TwitterPost>>(
        TWITTER_LIVE_ROUTES.post(postId),
        { fields: fieldsCsv }
      );
      return (response.results ?? [])[0] ?? null;
    });
    return results.filter((post): post is TwitterPost => post !== null);
  }

  async getPostsByAuthor(
    identifier: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TwitterPost>> {
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({
        username: identifier,
        fields: options.fields,
        startDate: options.startDate,
        endDate: options.endDate,
        forceLatest: options.forceLatest,
        responseType: options.responseType,
        limit: options.limit,
      });
      const result = await this.callAndMaybePoll(tools.GET_TWITTER_POSTS_BY_AUTHOR, args);
      return this.buildPaginatedResult(result, parseTwitterPost, tools.GET_TWITTER_POSTS_BY_AUTHOR, args);
    }

    const params = {
      since: options.startDate,
      until: options.endDate,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<TwitterPost>>(
      TWITTER_LIVE_ROUTES.userPosts(identifier),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TwitterPost>>(
        TWITTER_LIVE_ROUTES.userPosts(identifier),
        { ...params, cursor }
      )
    );
  }

  async searchPosts(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      authorUsername?: string;
      authorId?: string;
      language?: string;
      filterOutRetweets?: boolean;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TwitterPost>> {
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({
        query,
        fields: options.fields,
        startDate: options.startDate,
        endDate: options.endDate,
        authorUsername: options.authorUsername,
        authorId: options.authorId,
        language: options.language,
        filterOutRetweets: options.filterOutRetweets,
        forceLatest: options.forceLatest,
        responseType: options.responseType,
        limit: options.limit,
      });
      const raw = await this.callTool(tools.SEARCH_TWITTER_POSTS, args);
      const exportOpId =
        (raw["operationId"] as string) ??
        (raw["dataDumpExportOperationId"] as string) ??
        null;
      const csvRaw: RawDict = {
        results: [],
        dataDumpExportOperationId: exportOpId,
      };
      return this.buildPaginatedResult(
        csvRaw,
        parseTwitterPost,
        tools.SEARCH_TWITTER_POSTS,
        args
      );
    }

    const params = {
      q: query,
      since: options.startDate,
      until: options.endDate,
      username: options.authorUsername,
      lang: options.language,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<TwitterPost>>(
      TWITTER_LIVE_ROUTES.posts,
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TwitterPost>>(
        TWITTER_LIVE_ROUTES.posts,
        { ...params, cursor }
      )
    );
  }

  async getRetweets(
    postId: string,
    options: { fields?: string[]; startDate?: string } = {}
  ): Promise<PaginatedResult<TwitterPost>> {
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_RETWEETS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseTwitterPost,
      tools.GET_TWITTER_RETWEETS,
      args
    );
  }

  async getQuotes(
    postId: string,
    options: {
      fields?: string[];
      startDate?: string;
      forceLatest?: boolean;
    } = {}
  ): Promise<PaginatedResult<TwitterPost>> {
    const params = { fields: csvFields(options.fields) };
    const response = await this.rest.get<CursorPageResponse<TwitterPost>>(
      TWITTER_LIVE_ROUTES.postQuotes(postId),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TwitterPost>>(
        TWITTER_LIVE_ROUTES.postQuotes(postId),
        { ...params, cursor }
      )
    );
  }

  async getComments(
    postId: string,
    options: {
      fields?: string[];
      startDate?: string;
      forceLatest?: boolean;
    } = {}
  ): Promise<PaginatedResult<TwitterPost>> {
    const params = { fields: csvFields(options.fields) };
    const response = await this.rest.get<CursorPageResponse<TwitterPost>>(
      TWITTER_LIVE_ROUTES.postComments(postId),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TwitterPost>>(
        TWITTER_LIVE_ROUTES.postComments(postId),
        { ...params, cursor }
      )
    );
  }

  async getPostInteractingUsers(
    postId: string,
    interactionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<TwitterUser>> {
    const params = {
      interactionType,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<TwitterUser>>(
      TWITTER_LIVE_ROUTES.postInteractingUsers(postId),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TwitterUser>>(
        TWITTER_LIVE_ROUTES.postInteractingUsers(postId),
        { ...params, cursor }
      )
    );
  }

  async countPosts(
    phrase: string,
    options: { startDate?: string; endDate?: string } = {}
  ): Promise<number> {
    const args = this.buildArgs({ phrase, ...options });
    const result = await this.callAndMaybePoll(tools.COUNT_TWEETS, args);
    const count = result["results"] ?? result["count"] ?? 0;
    if (Array.isArray(count)) {
      if (count.length === 0) return 0;
      const first = count[0];
      if (first !== null && typeof first === "object") {
        return Number(Object.values(first as Record<string, unknown>)[0]);
      }
      return Number(first);
    }
    return Number(count);
  }

  async getUsers(
    identifiers: string[],
    options: { identifierType?: string; fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<TwitterUser[]> {
    if ((options.identifierType ?? "username") === "id") {
      const args = this.buildArgs({
        identifiers,
        identifierType: "id",
        fields: options.fields,
        forceLatest: options.forceLatest,
      });
      const result = await this.callAndMaybePoll(tools.GET_TWITTER_USERS, args);
      return ((result["results"] as RawDict[]) ?? []).map(parseUser);
    }

    const fieldsCsv = csvFields(options.fields);
    const results = await parallelMap(identifiers, async (username) => {
      const response = await this.rest.get<CursorPageResponse<TwitterUser>>(
        TWITTER_LIVE_ROUTES.user(username),
        { fields: fieldsCsv }
      );
      return (response.results ?? [])[0] ?? null;
    });
    return results.filter((user): user is TwitterUser => user !== null);
  }

  async getUser(
    identifier: string,
    options: { identifierType?: string; fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<TwitterUser> {
    if ((options.identifierType ?? "username") === "id") {
      const args = this.buildArgs({
        identifier,
        identifierType: "id",
        fields: options.fields,
        forceLatest: options.forceLatest,
      });
      const result = await this.callAndMaybePoll(tools.GET_TWITTER_USER, args);
      const results = result["results"];
      if (Array.isArray(results) && results.length > 0) {
        return results[0] as TwitterUser;
      }
      return result as TwitterUser;
    }

    const response = await this.rest.get<CursorPageResponse<TwitterUser>>(
      TWITTER_LIVE_ROUTES.user(identifier),
      { fields: csvFields(options.fields) }
    );
    if (response.results && response.results.length > 0) {
      return response.results[0];
    }
    throw new Error(`User not found: ${identifier}`);
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<TwitterUser[]> {
    const response = await this.rest.get<CursorPageResponse<TwitterUser>>(
      TWITTER_LIVE_ROUTES.users,
      { q: name, fields: csvFields(options.fields) }
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
    options: {
      fields?: string[];
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TwitterUser>> {
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({ username, connectionType, ...options });
      const result = await this.callAndMaybePoll(tools.GET_TWITTER_USER_CONNECTIONS, args);
      return this.buildPaginatedResult(result, parseUser, tools.GET_TWITTER_USER_CONNECTIONS, args);
    }

    const params = {
      connectionType,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<TwitterUser>>(
      TWITTER_LIVE_ROUTES.userConnections(username),
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<TwitterUser>>(
        TWITTER_LIVE_ROUTES.userConnections(username),
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
      language?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<TwitterUser>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_USERS_BY_KEYWORDS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_TWITTER_USERS_BY_KEYWORDS,
      args
    );
  }
}
