import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, sevenDaysAgo } from "./setup.js";
import { XpozClient, PaginatedResult, ResponseType } from "../src/index.js";
import type { TwitterPost, TwitterUser } from "../src/index.js";

const TWITTER_POST_ID = "1874266108200673750";

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

describe("TwitterUsers", () => {
  let usersByKeywordsFast: PaginatedResult<TwitterUser>;
  let usersByKeywordsPaging: PaginatedResult<TwitterUser>;

  beforeAll(async () => {
    if (!hasClient()) return;
    usersByKeywordsFast = await client.twitter.getUsersByKeywords(
      "artificial intelligence",
      {
        startDate: sevenDaysAgo(),
        responseType: ResponseType.Fast,
        limit: 10,
      }
    );
    usersByKeywordsPaging = await client.twitter.getUsersByKeywords(
      "artificial intelligence",
      {
        startDate: sevenDaysAgo(),
        responseType: ResponseType.Paging,
      }
    );
  });

  it("get_user by username", async () => {
    if (!hasClient()) return;
    const user = await client.twitter.getUser("elonmusk");
    expect(user).toBeDefined();
    expect((user as TwitterUser).username).toBe("elonmusk");
  });

  it("get_user by id", async () => {
    if (!hasClient()) return;
    const user = await client.twitter.getUser("44196397", {
      identifierType: "id",
    });
    expect(user).toBeDefined();
    expect((user as TwitterUser).id).toBe("44196397");
  });

  it("get_user with fields", async () => {
    if (!hasClient()) return;
    const user = await client.twitter.getUser("elonmusk", {
      fields: ["id", "username", "followersCount"],
    });
    expect(user).toBeDefined();
    const u = user as TwitterUser;
    expect(u.id).toBeTruthy();
    expect(u.username).toBeTruthy();
    expect(u.followersCount).toBeDefined();
  });

  it("search_users", async () => {
    if (!hasClient()) return;
    const users = await client.twitter.searchUsers("elon");
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect((u as TwitterUser).username).toBeTruthy();
    }
  });

  it("get_user_connections", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getUserConnections(
      "elonmusk",
      "followers"
    );
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.pagination.totalRows).toBeGreaterThan(0);
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
    expect(usersByKeywordsPaging.pagination.totalRows).toBeGreaterThan(0);
    expect(usersByKeywordsPaging.pagination.tableName).toBeTruthy();
  });
});

describe("TwitterPosts", () => {
  let searchResult: PaginatedResult<TwitterPost>;
  let pagingResult: PaginatedResult<TwitterPost>;
  let csvResult: PaginatedResult<TwitterPost>;

  beforeAll(async () => {
    if (!hasClient()) return;
    searchResult = await client.twitter.searchPosts("bitcoin", {
      startDate: sevenDaysAgo(),
      fields: ["id", "text", "likeCount", "retweetCount"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    pagingResult = await client.twitter.searchPosts("bitcoin", {
      startDate: sevenDaysAgo(),
      fields: ["id", "text", "likeCount", "retweetCount"],
      responseType: ResponseType.Paging,
    });
    csvResult = await client.twitter.searchPosts("bitcoin", {
      startDate: sevenDaysAgo(),
      responseType: ResponseType.Csv,
    });
  });

  it("get_posts_by_author (fast mode)", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getPostsByAuthor("elonmusk", {
      startDate: sevenDaysAgo(),
      fields: ["id", "text", "likeCount"],
      responseType: ResponseType.Fast,
      limit: 10,
    });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
    for (const post of result.data) {
      expect((post as TwitterPost).text).toBeTruthy();
    }
  });

  it("get_posts_by_author (paging mode)", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getPostsByAuthor("elonmusk", {
      startDate: sevenDaysAgo(),
      fields: ["id", "text", "likeCount"],
      responseType: ResponseType.Paging,
    });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.pagination.totalRows).toBeGreaterThan(0);
    expect(result.pagination.tableName).toBeTruthy();
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

  it("search_posts pagination", async () => {
    if (!hasClient()) return;
    if (!pagingResult.hasNextPage()) return;
    const page2 = await pagingResult.nextPage();
    expect(page2).toBeInstanceOf(PaginatedResult);
    expect(page2.data.length).toBeGreaterThan(0);
  });

  it("search_posts with filterOutRetweets", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.searchPosts("bitcoin", {
      startDate: sevenDaysAgo(),
      filterOutRetweets: true,
      responseType: ResponseType.Fast,
      limit: 10,
    });
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.data.length).toBeGreaterThan(0);
    for (const post of result.data) {
      const text = (post as TwitterPost).text ?? "";
      expect(text.startsWith("RT @")).toBe(false);
    }
  });

  it("get_retweets", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getRetweets(TWITTER_POST_ID);
    expect(result).toBeInstanceOf(PaginatedResult);
  });

  it("get_quotes", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getQuotes(TWITTER_POST_ID);
    expect(result).toBeInstanceOf(PaginatedResult);
  });

  it("get_comments", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getComments(TWITTER_POST_ID);
    expect(result).toBeInstanceOf(PaginatedResult);
  });

  it("get_post_interacting_users", async () => {
    if (!hasClient()) return;
    const result = await client.twitter.getPostInteractingUsers(
      TWITTER_POST_ID,
      "commenters"
    );
    expect(result).toBeInstanceOf(PaginatedResult);
  });

  it("get_posts_by_ids", async () => {
    if (!hasClient()) return;
    const posts = await client.twitter.getPostsByIds([TWITTER_POST_ID]);
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBe(1);
    expect((posts[0] as TwitterPost).id).toBeTruthy();
  });

  it("count_posts", async () => {
    if (!hasClient()) return;
    const count = await client.twitter.countPosts("bitcoin", {
      startDate: sevenDaysAgo(),
    });
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0);
  });

  it("export_csv", async () => {
    if (!hasClient()) return;
    const url = await csvResult.exportCsv();
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });
});
