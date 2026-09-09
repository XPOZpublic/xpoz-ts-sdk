import { CursorResult } from "../cursor.js";
import { TWITTER_LIVE_ROUTES } from "../config/routes.js";
import { LiveNamespace, csvFields } from "./liveBase.js";
import type {
  TwitterConnectionType,
  TwitterInteractionType,
  TwitterLiveSortBy,
} from "../types/common.js";
import type { TwitterPost, TwitterUser } from "../types/twitter.js";

export class TwitterLiveNamespace extends LiveNamespace {
  async searchPosts(
    query: string,
    options: {
      since?: string;
      until?: string;
      lang?: string;
      countryCode?: string;
      sortBy?: TwitterLiveSortBy;
      fields?: string[];
      cursor?: string;
    } = {}
  ): Promise<CursorResult<TwitterPost>> {
    return this.page<TwitterPost>(TWITTER_LIVE_ROUTES.posts, {
      q: query,
      since: options.since,
      until: options.until,
      lang: options.lang,
      countryCode: options.countryCode,
      sortBy: options.sortBy,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getPostsByUser(
    username: string,
    options: { since?: string; until?: string; fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<TwitterPost>> {
    return this.page<TwitterPost>(TWITTER_LIVE_ROUTES.userPosts(username), {
      since: options.since,
      until: options.until,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getPost(
    postId: string,
    options: { fields?: string[] } = {}
  ): Promise<TwitterPost | null> {
    return this.single<TwitterPost>(TWITTER_LIVE_ROUTES.post(postId), {
      fields: csvFields(options.fields),
    });
  }

  async getComments(
    postId: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<TwitterPost>> {
    return this.page<TwitterPost>(TWITTER_LIVE_ROUTES.postComments(postId), {
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getQuotes(
    postId: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<TwitterPost>> {
    return this.page<TwitterPost>(TWITTER_LIVE_ROUTES.postQuotes(postId), {
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getPostInteractingUsers(
    postId: string,
    interactionType: TwitterInteractionType,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<TwitterUser>> {
    return this.page<TwitterUser>(TWITTER_LIVE_ROUTES.postInteractingUsers(postId), {
      interactionType,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async searchUsers(
    query: string,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<TwitterUser>> {
    return this.page<TwitterUser>(TWITTER_LIVE_ROUTES.users, {
      q: query,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }

  async getUser(
    username: string,
    options: { fields?: string[] } = {}
  ): Promise<TwitterUser | null> {
    return this.single<TwitterUser>(TWITTER_LIVE_ROUTES.user(username), {
      fields: csvFields(options.fields),
    });
  }

  async getUserConnections(
    username: string,
    connectionType: TwitterConnectionType,
    options: { fields?: string[]; cursor?: string } = {}
  ): Promise<CursorResult<TwitterUser>> {
    return this.page<TwitterUser>(TWITTER_LIVE_ROUTES.userConnections(username), {
      connectionType,
      fields: csvFields(options.fields),
      cursor: options.cursor,
    });
  }
}
