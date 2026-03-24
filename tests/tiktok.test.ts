import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, sevenDaysAgo } from "./setup.js";
import { XpozClient, PaginatedResult, ResponseType } from "../src/index.js";
import type { TiktokPost, TiktokUser } from "../src/index.js";

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
  console.log(!!process.env["XPOZ_API_KEY"]);
  return !!process.env["XPOZ_API_KEY"];
}

describe("TiktokUsers", () => {
  let usersByKeywordsFast: PaginatedResult<TiktokUser>;
  let usersByKeywordsPaging: PaginatedResult<TiktokUser>;

  beforeAll(async () => {
    if (!hasClient()) return;
    usersByKeywordsFast = await client.tiktok.getUsersByKeywords("dance", {
      startDate: sevenDaysAgo(),
      responseType: ResponseType.Fast,
      limit: 10,
    });
    usersByKeywordsPaging = await client.tiktok.getUsersByKeywords("dance", {
      startDate: sevenDaysAgo(),
      responseType: ResponseType.Paging,
    });
  });

  it("get_user", async () => {
    if (!hasClient()) return;
    const user = await client.tiktok.getUser("tiktok");
    expect(user).toBeDefined();
    expect((user as TiktokUser).username).toBe("tiktok");
  });

  it("get_user with fields", async () => {
    if (!hasClient()) return;
    const user = await client.tiktok.getUser("tiktok", {
      fields: ["id", "username", "followerCount"],
    });
    expect(user).toBeDefined();
    const u = user as TiktokUser;
    expect(u.id).toBeTruthy();
    expect(u.username).toBeTruthy();
    expect(u.followerCount).toBeDefined();
  });

  it("search_users", async () => {
    if (!hasClient()) return;
    const users = await client.tiktok.searchUsers("charli");
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it("get_users_by_keywords (fast mode)", () => {
    if (!hasClient()) return;
    expect(usersByKeywordsFast).toBeInstanceOf(PaginatedResult);
    expect(usersByKeywordsFast.data.length).toBeGreaterThan(0);
  });

  it("get_users_by_keywords (paging mode)", () => {
    if (!hasClient()) return;
    expect(usersByKeywordsPaging).toBeInstanceOf(PaginatedResult);
    expect(usersByKeywordsPaging.data.length).toBeGreaterThan(0);
    expect(usersByKeywordsPaging.pagination.totalRows).toBeGreaterThan(0);
    expect(usersByKeywordsPaging.pagination.tableName).toBeTruthy();
  });
});

describe("TiktokPosts", () => {
  let postsFastResult: PaginatedResult<TiktokPost>;
  let postsPagingResult: PaginatedResult<TiktokPost>;
  let searchFastResult: PaginatedResult<TiktokPost>;
  let searchPagingResult: PaginatedResult<TiktokPost>;

  beforeAll(async () => {
    if (!hasClient()) return;
    postsFastResult = await client.tiktok.getPostsByUser("tiktok", {
      startDate: sevenDaysAgo(),
      fields: ["id", "description", "likeCount"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    postsPagingResult = await client.tiktok.getPostsByUser("tiktok", {
      startDate: sevenDaysAgo(),
      fields: ["id", "description", "likeCount"],
      responseType: ResponseType.Paging,
    });
    searchFastResult = await client.tiktok.searchPosts("dance", {
      startDate: sevenDaysAgo(),
      fields: ["id", "description", "likeCount"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    searchPagingResult = await client.tiktok.searchPosts("dance", {
      startDate: sevenDaysAgo(),
      fields: ["id", "description", "likeCount"],
      responseType: ResponseType.Paging,
    });
  });

  it("get_posts_by_user (fast mode)", () => {
    if (!hasClient()) return;
    expect(postsFastResult).toBeInstanceOf(PaginatedResult);
    expect(postsFastResult.data.length).toBeGreaterThan(0);
  });

  it("get_posts_by_user (paging mode)", () => {
    if (!hasClient()) return;
    expect(postsPagingResult).toBeInstanceOf(PaginatedResult);
    expect(postsPagingResult.data.length).toBeGreaterThan(0);
    expect(postsPagingResult.pagination.totalRows).toBeGreaterThan(0);
    expect(postsPagingResult.pagination.tableName).toBeTruthy();
  });

  it("search_posts (fast mode)", () => {
    if (!hasClient()) return;
    expect(searchFastResult).toBeInstanceOf(PaginatedResult);
    expect(searchFastResult.data.length).toBeGreaterThan(0);
  });

  it("search_posts (paging mode)", () => {
    if (!hasClient()) return;
    expect(searchPagingResult).toBeInstanceOf(PaginatedResult);
    expect(searchPagingResult.data.length).toBeGreaterThan(0);
    expect(searchPagingResult.pagination.totalRows).toBeGreaterThan(0);
    expect(searchPagingResult.pagination.tableName).toBeTruthy();
  });

  it("get_posts_by_ids", async () => {
    if (!hasClient()) return;
    if (!postsFastResult || postsFastResult.data.length === 0) return;
    const postId = (postsFastResult.data[0] as TiktokPost).id!;
    const posts = await client.tiktok.getPostsByIds([postId]);
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBe(1);
    expect((posts[0] as TiktokPost).id).toBeTruthy();
  });

  it("get_comments", async () => {
    if (!hasClient()) return;
    if (!postsFastResult || postsFastResult.data.length === 0) return;
    const postId = (postsFastResult.data[0] as TiktokPost).id!;
    const result = await client.tiktok.getComments(postId);
    expect(result).toBeInstanceOf(PaginatedResult);
  });
});
