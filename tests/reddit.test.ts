import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, sevenDaysAgo } from "./setup.js";
import { XpozClient, PaginatedResult, ResponseType } from "../src/index.js";
import type {
  RedditPost,
  RedditUser,
  RedditSubreddit,
  RedditPostWithComments,
  SubredditWithPosts,
} from "../src/index.js";
import { expectHasFields, expectPaginationStructure } from "./schemaValidators.js";

const REDDIT_POST_ID = "1l4da15";

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

describe("RedditUsers", () => {
  it("get_user", async () => {
    if (!hasClient()) return;
    const user = await client.reddit.getUser("spez");
    expect(user).toBeDefined();
    const u = user as RedditUser & { error?: string };
    if (u.error) return;
    expect(u.username).toBe("spez");
    expectHasFields(user as Record<string, unknown>, ["id", "username", "totalKarma"], "RedditUser");
  });

  it("search_users", async () => {
    if (!hasClient()) return;
    const users = await client.reddit.searchUsers("spez");
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it("get_users_by_keywords", async () => {
    if (!hasClient()) return;
    const result = await client.reddit.getUsersByKeywords("programming", {
      startDate: sevenDaysAgo(),
    });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("RedditPosts", () => {
  let searchResult: PaginatedResult<RedditPost>;
  let pagingResult: PaginatedResult<RedditPost>;

  beforeAll(async () => {
    if (!hasClient()) return;
    searchResult = await client.reddit.searchPosts("python", {
      startDate: sevenDaysAgo(),
      fields: ["id", "title", "score"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    pagingResult = await client.reddit.searchPosts("python", {
      startDate: sevenDaysAgo(),
      fields: ["id", "title", "score"],
      responseType: ResponseType.Paging,
    });
  });

  it("search_posts (fast mode)", () => {
    if (!hasClient()) return;
    expect(searchResult).toBeInstanceOf(PaginatedResult);
    expect(searchResult.data.length).toBeGreaterThan(0);
  });

  it("search_posts (paging mode)", () => {
    if (!hasClient()) return;
    expect(pagingResult).toBeInstanceOf(PaginatedResult);
    expect(pagingResult.data.length).toBeGreaterThan(0);
    expect(pagingResult.pagination.totalRows).toBeGreaterThan(0);
    expect(pagingResult.pagination.tableName).toBeTruthy();
  });

  it("search_posts with subreddit filter", async () => {
    if (!hasClient()) return;
    const result = await client.reddit.searchPosts("question", {
      startDate: sevenDaysAgo(),
      subreddit: "AskReddit",
      fields: ["id", "title", "subredditName"],
    });
    expect(result).toBeInstanceOf(PaginatedResult);
  });

  it("search_posts pagination", async () => {
    if (!hasClient()) return;
    if (!pagingResult.hasNextPage()) return;
    const page2 = await pagingResult.nextPage();
    expect(page2).toBeInstanceOf(PaginatedResult);
    expect(page2.data.length).toBeGreaterThan(0);
  });

  it("get_post_with_comments", async () => {
    if (!hasClient()) return;
    const result = await client.reddit.getPostWithComments(REDDIT_POST_ID);
    expect(result).toBeDefined();
    const r = result as RedditPostWithComments;
    expect(r.post).toBeDefined();
    expect(Array.isArray(r.comments)).toBe(true);
  });

  it("search_comments", async () => {
    if (!hasClient()) return;
    const result = await client.reddit.searchComments("python", {
      startDate: sevenDaysAgo(),
    });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("RedditSubreddits", () => {
  it("search_subreddits", async () => {
    if (!hasClient()) return;
    const subreddits = await client.reddit.searchSubreddits("python");
    expect(Array.isArray(subreddits)).toBe(true);
    if (subreddits.length === 0) return;
    for (const s of subreddits) {
      expect(s).toBeDefined();
    }
  });

  it("get_subreddit_with_posts", async () => {
    if (!hasClient()) return;
    const result = await client.reddit.getSubredditWithPosts("python");
    expect(result).toBeDefined();
    const r = result as SubredditWithPosts;
    expect(r.subreddit).toBeDefined();
    expect((r.subreddit as RedditSubreddit).displayName).toBeTruthy();
    expect(Array.isArray(r.posts)).toBe(true);
  });

  it("get_subreddits_by_keywords", async () => {
    if (!hasClient()) return;
    const result = await client.reddit.getSubredditsByKeywords("programming");
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
  });
});
