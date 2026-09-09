import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { RestTransport } from "../src/rest/transport.js";
import { TwitterLiveNamespace } from "../src/namespaces/twitterLive.js";
import { CursorResult, AuthenticationError, ValidationError } from "../src/index.js";

interface RecordedRequest {
  path: string;
  params: URLSearchParams;
  headers: Record<string, string | string[] | undefined>;
}

const recorded: RecordedRequest[] = [];
let server: Server;
let baseUrl: string;

function send(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

function tweetPage(id: string, cursor: string | null, hasMore: boolean) {
  return {
    results: [{ id, authorUsername: "nasa", likeCount: 10 }],
    count: 1,
    dataSource: "api",
    has_more: hasMore,
    next_page_cursor: cursor,
  };
}

function userPage(id: string | number) {
  return {
    results: [{ id, username: "nasa" }],
    count: 1,
    dataSource: "api",
    has_more: false,
    next_page_cursor: null,
  };
}

function handler(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://localhost");
  recorded.push({ path: url.pathname, params: url.searchParams, headers: req.headers });

  if (req.headers.authorization !== "Bearer test-key") {
    send(res, 403, { success: false, message: "forbidden" });
    return;
  }

  if (url.pathname === "/api/data/twitter/posts/live") {
    if (!url.searchParams.get("q")) {
      send(res, 400, { success: false, error: "q is required" });
      return;
    }
    if (url.searchParams.get("cursor") === "cur-1") {
      send(res, 200, tweetPage("tweet-2", null, false));
      return;
    }
    send(res, 200, tweetPage("tweet-1", "cur-1", true));
    return;
  }

  if (url.pathname === "/api/data/twitter/posts/users/nasa/live") {
    send(res, 200, tweetPage("tweet-1", null, false));
    return;
  }

  if (url.pathname === "/api/data/twitter/posts/123/live") {
    send(res, 200, tweetPage("123", null, false));
    return;
  }

  if (url.pathname === "/api/data/twitter/posts/123/comments/live") {
    send(res, 200, tweetPage("comment-1", null, false));
    return;
  }

  if (url.pathname === "/api/data/twitter/posts/123/quotes/live") {
    send(res, 200, tweetPage("quote-1", null, false));
    return;
  }

  if (url.pathname === "/api/data/twitter/posts/123/interacting-users/live") {
    send(res, 200, userPage(223214544));
    return;
  }

  if (url.pathname === "/api/data/twitter/users/live") {
    send(res, 200, userPage("u1"));
    return;
  }

  if (url.pathname === "/api/data/twitter/users/nasa/live") {
    send(res, 200, userPage("u1"));
    return;
  }

  if (url.pathname === "/api/data/twitter/users/nasa/connections/live") {
    send(res, 200, userPage("u2"));
    return;
  }

  send(res, 404, { success: false, message: "not found" });
}

function live(key = "test-key"): TwitterLiveNamespace {
  return new TwitterLiveNamespace(new RestTransport(baseUrl, key));
}

beforeAll(async () => {
  server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  recorded.length = 0;
});

describe("twitterLive", () => {
  it("returns a CursorResult with has_more and the cursor", async () => {
    const page = await live().searchPosts("space", { fields: ["id", "likeCount"] });

    expect(page).toBeInstanceOf(CursorResult);
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.id).toBe("tweet-1");
    expect(page.hasMore).toBe(true);
    expect(page.nextPageCursor).toBe("cur-1");
  });

  it("sends search filters as query params", async () => {
    await live().searchPosts("space", {
      since: "2026-01-01",
      until: "2026-02-01",
      lang: "en",
      countryCode: "US",
      sortBy: "latest",
      fields: ["id", "likeCount"],
    });

    const params = recorded.at(-1)?.params;
    expect(params?.get("q")).toBe("space");
    expect(params?.get("since")).toBe("2026-01-01");
    expect(params?.get("until")).toBe("2026-02-01");
    expect(params?.get("lang")).toBe("en");
    expect(params?.get("countryCode")).toBe("US");
    expect(params?.get("sortBy")).toBe("latest");
    expect(params?.get("fields")).toBe("id,likeCount");
  });

  it("omits the cursor and unset filters on the first request", async () => {
    await live().searchPosts("space");

    const params = recorded.at(-1)?.params;
    expect(params?.has("cursor")).toBe(false);
    expect(params?.has("since")).toBe(false);
    expect(params?.has("sortBy")).toBe(false);
  });

  it("threads the cursor into the next page and terminates", async () => {
    const first = await live().searchPosts("space");
    const second = await first.nextPage();

    expect(recorded.at(-1)?.params.get("cursor")).toBe("cur-1");
    expect(second.data[0]?.id).toBe("tweet-2");
    expect(second.hasNextPage()).toBe(false);
    await expect(second.nextPage()).rejects.toThrow(RangeError);
  });

  it("walks every page via items()", async () => {
    const page = await live().searchPosts("space");
    const ids: (string | null | undefined)[] = [];
    for await (const tweet of page.items()) {
      ids.push(tweet.id);
    }

    expect(ids).toEqual(["tweet-1", "tweet-2"]);
  });

  it("routes user posts with the date window", async () => {
    await live().getPostsByUser("nasa", { since: "2026-01-01" });

    expect(recorded.at(-1)?.path).toBe("/api/data/twitter/posts/users/nasa/live");
    expect(recorded.at(-1)?.params.get("since")).toBe("2026-01-01");
  });

  it("unwraps single-item routes", async () => {
    const tweet = await live().getPost("123");
    const user = await live().getUser("nasa");

    expect(tweet?.id).toBe("123");
    expect(user?.username).toBe("nasa");
  });

  it("routes comments and quotes to their own paths", async () => {
    const comments = await live().getComments("123");
    expect(recorded.at(-1)?.path).toBe("/api/data/twitter/posts/123/comments/live");
    expect(comments.data[0]?.id).toBe("comment-1");

    const quotes = await live().getQuotes("123");
    expect(recorded.at(-1)?.path).toBe("/api/data/twitter/posts/123/quotes/live");
    expect(quotes.data[0]?.id).toBe("quote-1");
  });

  it("sends interaction and connection types and coerces integer ids", async () => {
    const interacting = await live().getPostInteractingUsers("123", "retweeters");
    expect(recorded.at(-1)?.params.get("interactionType")).toBe("retweeters");
    expect(interacting.data[0]?.id).toBe("223214544");

    await live().getUserConnections("nasa", "followers");
    expect(recorded.at(-1)?.path).toBe("/api/data/twitter/users/nasa/connections/live");
    expect(recorded.at(-1)?.params.get("connectionType")).toBe("followers");
  });

  it("sends the bearer token and sdk user agent", async () => {
    await live().searchUsers("nasa");

    const headers = recorded.at(-1)?.headers;
    expect(headers?.authorization).toBe("Bearer test-key");
    expect(String(headers?.["user-agent"])).toMatch(/^xpoz-ts-sdk\//);
  });

  it("maps a 400 to ValidationError", async () => {
    await expect(live().searchPosts("")).rejects.toThrow(ValidationError);
  });

  it("maps a rejected key to AuthenticationError", async () => {
    await expect(live("wrong-key").searchUsers("nasa")).rejects.toThrow(AuthenticationError);
  });
});
