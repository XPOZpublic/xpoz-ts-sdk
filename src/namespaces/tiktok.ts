import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import type { TiktokPost, TiktokUser, TiktokComment } from "../types/tiktok.js";
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

export class TiktokNamespace extends BaseNamespace {
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
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_POSTS_BY_USER, args);
    return this.buildPaginatedResult(
      result,
      parsePost,
      tools.GET_TIKTOK_POSTS_BY_USER,
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
  ): Promise<PaginatedResult<TiktokPost>> {
    const args = this.buildArgs({
      query,
      fields: options.fields,
      startDate: options.startDate,
      endDate: options.endDate,
      forceLatest: options.forceLatest,
      responseType: options.responseType,
      limit: options.limit,
    });
    const result = await this.callAndMaybePoll(tools.SEARCH_TIKTOK_POSTS, args);
    return this.buildPaginatedResult(result, parsePost, tools.SEARCH_TIKTOK_POSTS, args);
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
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_COMMENTS, args);
    return this.buildPaginatedResult(result, parseComment, tools.GET_TIKTOK_COMMENTS, args);
  }

  async getUser(
    identifier: string,
    options: { identifierType?: string; fields?: string[] } = {}
  ): Promise<TiktokUser> {
    const args = this.buildArgs({
      identifier,
      identifierType: options.identifierType ?? "username",
      fields: options.fields,
    });
    const result = await this.callAndMaybePoll(tools.GET_TIKTOK_USER, args);
    const results = result["results"];
    if (Array.isArray(results) && results.length > 0) {
      return results[0] as TiktokUser;
    }
    return result as TiktokUser;
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<TiktokUser[]> {
    const args = this.buildArgs({ name, ...options });
    const result = await this.callAndMaybePoll(tools.SEARCH_TIKTOK_USERS, args);
    return ((result["results"] as RawDict[]) ?? []).map(parseUser);
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
}
