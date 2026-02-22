import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "./setup.js";
import { XpozClient, PaginatedResult } from "../src/index.js";
import type { InstagramPost, InstagramUser } from "../src/index.js";

const INSTAGRAM_POST_ID = "3650461835687763021_8763092944";

let client: XpozClient;

beforeAll(async () => {
  const c = createTestClient();
  if (!c) return;
  await c.connect();
  client = c;
});

afterAll(async () => {
  if (client) await client.close();
});

function hasClient(): boolean {
  return !!process.env["XPOZ_API_KEY"];
}

describe("InstagramUsers", () => {
  it("get_user", async () => {
    if (!hasClient()) return;
    const user = await client.instagram.getUser("instagram");
    expect(user).toBeDefined();
    expect((user as InstagramUser).username).toBe("instagram");
  });

  it("get_user with fields", async () => {
    if (!hasClient()) return;
    const user = await client.instagram.getUser("instagram", {
      fields: ["id", "username", "followerCount"],
    });
    expect(user).toBeDefined();
    const u = user as InstagramUser;
    expect(u.id).toBeTruthy();
    expect(u.username).toBeTruthy();
    expect(u.followerCount).toBeDefined();
  });

  it("search_users", async () => {
    if (!hasClient()) return;
    const users = await client.instagram.searchUsers("nike");
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it("get_user_connections", async () => {
    if (!hasClient()) return;
    const result = await client.instagram.getUserConnections("instagram", "followers");
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("get_users_by_keywords", async () => {
    if (!hasClient()) return;
    const result = await client.instagram.getUsersByKeywords("fashion");
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("InstagramPosts", () => {
  let postsResult: PaginatedResult<InstagramPost>;

  beforeAll(async () => {
    if (!hasClient()) return;
    postsResult = await client.instagram.getPostsByUser("instagram", {
      fields: ["id", "caption", "likeCount"],
    });
  });

  it("get_posts_by_user", () => {
    if (!hasClient()) return;
    expect(postsResult).toBeInstanceOf(PaginatedResult);
    expect(postsResult.data.length).toBeGreaterThan(0);
  });

  it("search_posts", async () => {
    if (!hasClient()) return;
    const result = await client.instagram.searchPosts("travel", {
      fields: ["id", "caption", "likeCount"],
    });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.pagination.totalRows).toBeGreaterThan(0);
  });

  it("get_posts_by_ids", async () => {
    if (!hasClient()) return;
    const posts = await client.instagram.getPostsByIds([INSTAGRAM_POST_ID]);
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBe(1);
    expect((posts[0] as InstagramPost).id).toBeTruthy();
  });

  it("get_comments", async () => {
    if (!hasClient()) return;
    const result = await client.instagram.getComments(INSTAGRAM_POST_ID);
    expect(result).toBeInstanceOf(PaginatedResult);
  });

  it("get_post_interacting_users", async () => {
    if (!hasClient()) return;
    const result = await client.instagram.getPostInteractingUsers(
      INSTAGRAM_POST_ID,
      "commenters"
    );
    expect(result).toBeInstanceOf(PaginatedResult);
  });
});
