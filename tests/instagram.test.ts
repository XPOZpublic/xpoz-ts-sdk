import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, sevenDaysAgo } from "./setup.js";
import { XpozClient, PaginatedResult, ResponseType } from "../src/index.js";
import type { InstagramPost, InstagramUser } from "../src/index.js";
import { expectHasFields, expectPaginationStructure } from "./schemaValidators.js";

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
  console.log(!!process.env["XPOZ_API_KEY"]);
  return !!process.env["XPOZ_API_KEY"];
}

describe("InstagramUsers", () => {
  let usersByKeywordsFast: PaginatedResult<InstagramUser>;
  let usersByKeywordsPaging: PaginatedResult<InstagramUser>;

  beforeAll(async () => {
    if (!hasClient()) return;
    usersByKeywordsFast = await client.instagram.getUsersByKeywords("fashion", {
      startDate: sevenDaysAgo(),
      responseType: ResponseType.Fast,
      limit: 10,
    });
    usersByKeywordsPaging = await client.instagram.getUsersByKeywords("fashion", {
      startDate: sevenDaysAgo(),
      responseType: ResponseType.Paging,
    });
  });

  it("get_user", async () => {
    if (!hasClient()) return;
    const user = await client.instagram.getUser("instagram");
    expect(user).toBeDefined();
    expect((user as InstagramUser).username).toBe("instagram");
    expectHasFields(user as Record<string, unknown>, ["id", "username", "fullName"], "InstagramUser");
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
    const result = await client.instagram.getUserConnections(
      "instagram",
      "followers"
    );
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
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
    expectPaginationStructure(usersByKeywordsPaging);
  });
});

describe("InstagramPosts", () => {
  let postsFastResult: PaginatedResult<InstagramPost>;
  let postsPagingResult: PaginatedResult<InstagramPost>;
  let searchFastResult: PaginatedResult<InstagramPost>;
  let searchPagingResult: PaginatedResult<InstagramPost>;

  beforeAll(async () => {
    if (!hasClient()) return;
    postsFastResult = await client.instagram.getPostsByUser("instagram", {
      startDate: sevenDaysAgo(),
      fields: ["id", "caption", "likeCount"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    postsPagingResult = await client.instagram.getPostsByUser("instagram", {
      startDate: sevenDaysAgo(),
      fields: ["id", "caption", "likeCount"],
      responseType: ResponseType.Paging,
    });
    searchFastResult = await client.instagram.searchPosts("travel", {
      startDate: sevenDaysAgo(),
      fields: ["id", "caption", "likeCount"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    searchPagingResult = await client.instagram.searchPosts("travel", {
      startDate: sevenDaysAgo(),
      fields: ["id", "caption", "likeCount"],
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
