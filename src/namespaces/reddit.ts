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
import type { CursorPageResponse, PaginationInfo } from "../types/common.js";
import type { RestTransport } from "../rest/transport.js";
import { REDDIT_LIVE_ROUTES } from "../config/routes.js";
import { csvFields } from "./liveBase.js";
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
    if (options.responseType === ResponseType.Csv) {
      const args = this.buildArgs({ query, ...options });
      const result = await this.callAndMaybePoll(tools.SEARCH_REDDIT_POSTS, args);
      return this.buildPaginatedResult(result, parsePost, tools.SEARCH_REDDIT_POSTS, args);
    }

    const params = {
      q: query,
      sort: options.sort,
      time: options.time,
      subreddit: options.subreddit,
      since: options.startDate,
      until: options.endDate,
      limit: options.limit,
      fields: csvFields(options.fields),
    };
    const response = await this.rest.get<CursorPageResponse<RedditPost>>(
      REDDIT_LIVE_ROUTES.posts,
      params
    );
    return this.cursorToPaginatedResult(response, (cursor) =>
      this.rest.get<CursorPageResponse<RedditPost>>(
        REDDIT_LIVE_ROUTES.posts,
        { ...params, cursor }
      )
    );
  }

  async getPostWithComments(
    postId: string,
    options: {
      postFields?: string[];
      commentFields?: string[];
      forceLatest?: boolean;
    } = {}
  ): Promise<RedditPostWithComments> {
    const [postResponse, commentsResponse] = await Promise.all([
      this.rest.get<CursorPageResponse<RedditPost>>(
        REDDIT_LIVE_ROUTES.post(postId),
        { fields: csvFields(options.postFields) }
      ),
      this.rest.get<CursorPageResponse<RedditComment>>(
        REDDIT_LIVE_ROUTES.postComments(postId),
        { fields: csvFields(options.commentFields) }
      ),
    ]);

    const post = (postResponse.results ?? [])[0] ?? null;
    const comments = commentsResponse.results ?? [];
    const hasMore = Boolean(commentsResponse.has_more);
    const nextCursor = commentsResponse.next_page_cursor ?? null;

    const pagination: PaginationInfo = {
      tableName: null,
      totalRows: 0,
      totalPages: hasMore ? 2 : 1,
      pageNumber: 1,
      pageSize: comments.length,
      resultsCount: comments.length,
    };

    return {
      post: post as RedditPost,
      comments: comments as RedditComment[],
      commentsPagination: comments.length > 0 ? pagination : null,
      commentsTableName: null,
    };
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
    const response = await this.rest.get<CursorPageResponse<RedditUser>>(
      REDDIT_LIVE_ROUTES.user(username),
      { fields: csvFields(options.fields) }
    );
    if (response.results && response.results.length > 0) {
      return response.results[0];
    }
    throw new Error(`User not found: ${username}`);
  }

  async searchUsers(
    name: string,
    options: { limit?: number; fields?: string[] } = {}
  ): Promise<RedditUser[]> {
    const response = await this.rest.get<CursorPageResponse<RedditUser>>(
      REDDIT_LIVE_ROUTES.users,
      {
        q: name,
        limit: options.limit,
        fields: csvFields(options.fields),
      }
    );
    return response.results ?? [];
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
    const response = await this.rest.get<CursorPageResponse<RedditSubreddit>>(
      REDDIT_LIVE_ROUTES.subreddits,
      {
        q: query,
        limit: options.limit,
        fields: csvFields(options.fields),
      }
    );
    return response.results ?? [];
  }

  async getSubredditWithPosts(
    subredditName: string,
    options: {
      subredditFields?: string[];
      postFields?: string[];
      forceLatest?: boolean;
    } = {}
  ): Promise<SubredditWithPosts> {
    const [subredditResponse, postsResponse] = await Promise.all([
      this.rest.get<CursorPageResponse<RedditSubreddit>>(
        REDDIT_LIVE_ROUTES.subreddit(subredditName),
        { fields: csvFields(options.subredditFields) }
      ),
      this.rest.get<CursorPageResponse<RedditPost>>(
        REDDIT_LIVE_ROUTES.subredditPosts(subredditName),
        { fields: csvFields(options.postFields) }
      ),
    ]);

    const subreddit = (subredditResponse.results ?? [])[0] ?? null;
    const posts = postsResponse.results ?? [];
    const hasMore = Boolean(postsResponse.has_more);

    const pagination: PaginationInfo = {
      tableName: null,
      totalRows: 0,
      totalPages: hasMore ? 2 : 1,
      pageNumber: 1,
      pageSize: posts.length,
      resultsCount: posts.length,
    };

    return {
      subreddit: subreddit as RedditSubreddit,
      posts: posts as RedditPost[],
      postsPagination: posts.length > 0 ? pagination : null,
      postsTableName: null,
    };
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
