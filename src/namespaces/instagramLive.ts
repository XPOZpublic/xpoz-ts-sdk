import { CursorResult } from "../cursor.js";
import { INSTAGRAM_LIVE_ROUTES } from "../config/routes.js";
import { LiveNamespace, csvFields } from "./liveBase.js";
import type { InstagramConnectionType, InstagramInteractionType } from "../types/common.js";
import type { InstagramComment, InstagramPost, InstagramUser } from "../types/instagram.js";

export class InstagramLiveNamespace extends LiveNamespace {
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
