import { BaseNamespace } from "./base.js";
import { PaginatedResult } from "../pagination.js";
import type {
  RedditPost,
  RedditUser,
  RedditComment,
  RedditSubreddit,
  RedditPostWithComments,
  SubredditWithPosts,
} from "../types/reddit.js";
import * as tools from "../config/tools.js";
import { ResponseType } from "../config/constants.js";

type RawDict = Record<string, unknown>;

function parsePost(item: RawDict): RedditPost {
  return item as RedditPost;
}

function parseUser(item: RawDict): RedditUser {
  return item as RedditUser;
}

function parseComment(item: RawDict): RedditComment {
  return item as RedditComment;
}

function parseSubreddit(item: RawDict): RedditSubreddit {
  return item as RedditSubreddit;
}

export class RedditNamespace extends BaseNamespace {
  async searchPosts(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      sort?: string;
      time?: string;
      subreddit?: string;
      forceLatest?: boolean;
      responseType?: ResponseType;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<RedditPost>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.SEARCH_REDDIT_POSTS, args);
    return this.buildPaginatedResult(result, parsePost, tools.SEARCH_REDDIT_POSTS, args);
  }

  async getPostWithComments(
    postId: string,
    options: {
      postFields?: string[];
      commentFields?: string[];
      forceLatest?: boolean;
    } = {}
  ): Promise<RedditPostWithComments> {
    const args = this.buildArgs({ postId, ...options });
    const result = await this.callAndMaybePoll(tools.GET_REDDIT_POST_WITH_COMMENTS, args);
    return this._parsePostWithComments(result);
  }

  async searchComments(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      subreddit?: string;
    } = {}
  ): Promise<PaginatedResult<RedditComment>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.SEARCH_REDDIT_COMMENTS, args);
    return this.buildPaginatedResult(result, parseComment, tools.SEARCH_REDDIT_COMMENTS, args);
  }

  async getCommentById(
    commentId: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<RedditComment> {
    const args = this.buildArgs({ commentId, ...options });
    const result = await this.callAndMaybePoll(tools.GET_REDDIT_COMMENT_BY_ID, args);
    const results = result["results"];
    if (Array.isArray(results) && results.length > 0) {
      return results[0] as RedditComment;
    }
    return result as RedditComment;
  }

  async getUser(
    username: string,
    options: { fields?: string[]; forceLatest?: boolean } = {}
  ): Promise<RedditUser> {
    const args = this.buildArgs({ username, ...options });
    const result = await this.callAndMaybePoll(tools.GET_REDDIT_USER, args);
    const results = result["results"];
    if (Array.isArray(results) && results.length > 0) {
      return results[0] as RedditUser;
    }
    return result as RedditUser;
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<RedditUser[]> {
    const args = this.buildArgs({ name, ...options });
    const result = await this.callAndMaybePoll(tools.SEARCH_REDDIT_USERS, args);
    return ((result["results"] as RawDict[]) ?? []).map(parseUser);
  }

  async getUsersByKeywords(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      subreddit?: string;
      forceLatest?: boolean;
    } = {}
  ): Promise<PaginatedResult<RedditUser>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.GET_REDDIT_USERS_BY_KEYWORDS, args);
    return this.buildPaginatedResult(
      result,
      parseUser,
      tools.GET_REDDIT_USERS_BY_KEYWORDS,
      args
    );
  }

  async searchSubreddits(
    query: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<RedditSubreddit[]> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.SEARCH_REDDIT_SUBREDDITS, args);
    return ((result["results"] as RawDict[]) ?? []).map(parseSubreddit);
  }

  async getSubredditWithPosts(
    subredditName: string,
    options: {
      subredditFields?: string[];
      postFields?: string[];
      forceLatest?: boolean;
    } = {}
  ): Promise<SubredditWithPosts> {
    const args = this.buildArgs({ subredditName, ...options });
    const result = await this.callAndMaybePoll(tools.GET_REDDIT_SUBREDDIT_WITH_POSTS, args);
    return this._parseSubredditWithPosts(result);
  }

  async getSubredditsByKeywords(
    query: string,
    options: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      forceLatest?: boolean;
    } = {}
  ): Promise<PaginatedResult<RedditSubreddit>> {
    const args = this.buildArgs({ query, ...options });
    const result = await this.callAndMaybePoll(tools.GET_REDDIT_SUBREDDITS_BY_KEYWORDS, args);
    return this.buildPaginatedResult(
      result,
      parseSubreddit,
      tools.GET_REDDIT_SUBREDDITS_BY_KEYWORDS,
      args
    );
  }

  private _parsePostWithComments(raw: RawDict): RedditPostWithComments {
    let results = (raw["results"] as RawDict) ?? {};
    if (Array.isArray(results)) {
      results = results.length > 0 ? results[0] : {};
    }

    const postData = (results["post"] as RawDict) ?? results;
    const commentsData = (results["comments"] as RawDict[]) ?? [];
    const pagination = this.extractPagination(raw);

    return {
      post: postData as RedditPost,
      comments: commentsData.map(parseComment),
      commentsPagination: pagination.totalPages > 0 ? pagination : null,
      commentsTableName: pagination.tableName ?? null,
    };
  }

  private _parseSubredditWithPosts(raw: RawDict): SubredditWithPosts {
    let results = (raw["results"] as RawDict) ?? {};
    if (Array.isArray(results)) {
      results = results.length > 0 ? results[0] : {};
    }

    const subredditData = (results["subreddit"] as RawDict) ?? results;
    const postsData = (results["posts"] as RawDict[]) ?? [];
    const pagination = this.extractPagination(raw);

    return {
      subreddit: subredditData as RedditSubreddit,
      posts: postsData.map(parsePost),
      postsPagination: pagination.totalPages > 0 ? pagination : null,
      postsTableName: pagination.tableName ?? null,
    };
  }
}
