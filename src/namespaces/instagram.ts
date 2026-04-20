import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import { NoDataResult } from "../results.js";
import type { InstagramPost, InstagramUser, InstagramComment } from "../types/instagram.js";
import * as tools from "../config/tools.js";
import { ResponseType } from "../config/constants.js";

type RawDict = Record<string, unknown>;

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
  ): Promise<PaginatedResult<InstagramPost> | NoDataResult> {
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
  ): Promise<PaginatedResult<InstagramPost> | NoDataResult> {
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
  ): Promise<PaginatedResult<InstagramComment> | NoDataResult> {
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_COMMENTS, args);
    return this.buildPaginatedResult(result, parseComment, tools.GET_INSTAGRAM_COMMENTS, args);
  }

  async getUser(
    identifier: string,
    options: { identifierType?: string; fields?: string[] } = {}
  ): Promise<InstagramUser> {
    const args = this.buildArgs({
      identifier,
      identifierType: options.identifierType ?? "username",
      fields: options.fields,
    });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_USER, args);
    const results = result["results"];
    if (Array.isArray(results) && results.length > 0) {
      return results[0] as InstagramUser;
    }
    return result as InstagramUser;
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<InstagramUser[]> {
    const args = this.buildArgs({ name, ...options });
    const result = await this.callAndMaybePoll(tools.SEARCH_INSTAGRAM_USERS, args);
    return ((result["results"] as RawDict[]) ?? []).map(parseUser);
  }

  async getUserConnections(
    username: string,
    connectionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<InstagramUser> | NoDataResult> {
    const args = this.buildArgs({ username, connectionType, ...options });
    const result = await this.callAndMaybePoll(tools.GET_INSTAGRAM_USER_CONNECTIONS, args);
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_INSTAGRAM_USER_CONNECTIONS,
      args
    );
  }

  async getPostInteractingUsers(
    postId: string,
    interactionType: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<PaginatedResult<InstagramUser> | NoDataResult> {
    const args = this.buildArgs({ postId, interactionType, ...options });
    const result = await this.callAndMaybePoll(
      tools.GET_INSTAGRAM_POST_INTERACTING_USERS,
      args
    );
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_INSTAGRAM_POST_INTERACTING_USERS,
      args
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
  ): Promise<PaginatedResult<InstagramUser> | NoDataResult> {
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
