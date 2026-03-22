import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import type { TwitterPost, TwitterUser } from "../types/twitter.js";
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
  async getPostsByIds(
    postIds: string[],
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<TwitterPost[]> {
    const args = this.buildArgs({ postIds, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_POSTS_BY_IDS,
      args
    );
    return ((result["results"] as RawDict[]) ?? []).map(parseTwitterPost);
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
    const args = this.buildArgs({
      username: identifier,
      fields: options.fields,
      startDate: options.startDate,
      endDate: options.endDate,
      forceLatest: options.forceLatest,
      responseType: options.responseType,
      limit: options.limit,
    });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_POSTS_BY_AUTHOR,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseTwitterPost,
      tools.GET_TWITTER_POSTS_BY_AUTHOR,
      args
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

    if (options.responseType === ResponseType.Csv) {
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

    const result = await this.callAndMaybePoll(
      tools.SEARCH_TWITTER_POSTS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseTwitterPost,
      tools.SEARCH_TWITTER_POSTS,
      args
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
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(tools.GET_TWITTER_QUOTES, args);
    return this.buildPaginatedResult(
      result,
      parseTwitterPost,
      tools.GET_TWITTER_QUOTES,
      args
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
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_COMMENTS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseTwitterPost,
      tools.GET_TWITTER_COMMENTS,
      args
    );
  }

  async getPostInteractingUsers(
    postId: string,
    interactionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<TwitterUser>> {
    const args = this.buildArgs({ postId, interactionType, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_POST_INTERACTING_USERS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_TWITTER_POST_INTERACTING_USERS,
      args
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

  async getUser(
    identifier: string,
    options: { identifierType?: string; fields?: string[] } = {}
  ): Promise<TwitterUser> {
    const args = this.buildArgs({
      identifier,
      identifierType: options.identifierType ?? "username",
      fields: options.fields,
    });
    const result = await this.callAndMaybePoll(tools.GET_TWITTER_USER, args);
    const results = result["results"];
    if (Array.isArray(results) && results.length > 0) {
      return results[0] as TwitterUser;
    }
    return result as TwitterUser;
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<TwitterUser[]> {
    const args = this.buildArgs({ name, ...options });
    const result = await this.callAndMaybePoll(
      tools.SEARCH_TWITTER_USERS,
      args
    );
    return ((result["results"] as RawDict[]) ?? []).map(parseUser);
  }

  async getUserConnections(
    username: string,
    connectionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<TwitterUser>> {
    const args = this.buildArgs({ username, connectionType, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_TWITTER_USER_CONNECTIONS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_TWITTER_USER_CONNECTIONS,
      args
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
