import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { RestTransport } from "../src/rest/transport.js";
import { InstagramLiveNamespace } from "../src/namespaces/instagramLive.js";
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

function postPage(id: string, cursor: string | null, hasMore: boolean) {
  return {
    results: [{ id, username: "natgeo", likeCount: 10 }],
    count: 1,
    dataSource: "api",
    has_more: hasMore,
    next_page_cursor: cursor,
  };
}

function handler(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://localhost");
  recorded.push({ path: url.pathname, params: url.searchParams, headers: req.headers });

  if (req.headers.authorization !== "Bearer test-key") {
    send(res, 403, { success: false, message: "forbidden" });
    return;
  }

  if (url.pathname === "/api/data/instagram/posts/live") {
    if (!url.searchParams.get("q")) {
      send(res, 400, { success: false, error: "q is required" });
      return;
    }
    if (url.searchParams.get("cursor") === "cur-1") {
      send(res, 200, postPage("post-2", null, false));
      return;
    }
    send(res, 200, postPage("post-1", "cur-1", true));
    return;
  }

  if (url.pathname === "/api/data/instagram/posts/p1/interacting-users/live") {
    send(res, 200, {
      results: [{ id: 223214544, username: "someone" }],
      count: 1,
      dataSource: "api",
      has_more: false,
      next_page_cursor: null,
    });
    return;
  }

  if (url.pathname === "/api/data/instagram/users/natgeo/live") {
    send(res, 200, {
      results: [{ id: "u1", username: "natgeo" }],
      count: 1,
      dataSource: "api",
      has_more: false,
      next_page_cursor: null,
    });
    return;
  }

  if (url.pathname === "/api/data/instagram/users/live") {
    send(res, 200, {
      results: [{ id: "u1", username: "natgeo" }],
      count: 1,
      dataSource: "api",
      has_more: false,
      next_page_cursor: null,
    });
    return;
  }

  send(res, 404, { success: false, message: "not found" });
}

function live(key = "test-key"): InstagramLiveNamespace {
  return new InstagramLiveNamespace(new RestTransport(baseUrl, key));
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

describe("instagramLive", () => {
  it("returns a CursorResult with has_more and the cursor", async () => {
    const page = await live().searchPosts("travel", { fields: ["id", "likeCount"] });

    expect(page).toBeInstanceOf(CursorResult);
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.id).toBe("post-1");
    expect(page.hasMore).toBe(true);
    expect(page.nextPageCursor).toBe("cur-1");
  });

  it("sends fields as a csv string", async () => {
    await live().searchPosts("travel", { fields: ["id", "likeCount"] });

    expect(recorded.at(-1)?.params.get("fields")).toBe("id,likeCount");
  });

  it("omits the cursor on the first request", async () => {
    await live().searchPosts("travel");

    expect(recorded.at(-1)?.params.has("cursor")).toBe(false);
  });

  it("threads the cursor into the next page and terminates", async () => {
    const first = await live().searchPosts("travel");
    const second = await first.nextPage();

    expect(recorded.at(-1)?.params.get("cursor")).toBe("cur-1");
    expect(second.data[0]?.id).toBe("post-2");
    expect(second.hasNextPage()).toBe(false);
    await expect(second.nextPage()).rejects.toThrow(RangeError);
  });

  it("walks every page via items()", async () => {
    const page = await live().searchPosts("travel");
    const ids: (string | null | undefined)[] = [];
    for await (const post of page.items()) {
      ids.push(post.id);
    }

    expect(ids).toEqual(["post-1", "post-2"]);
  });

  it("unwraps single-item routes", async () => {
    const user = await live().getUser("natgeo");

    expect(user?.username).toBe("natgeo");
  });

  it("coerces integer ids to strings", async () => {
    const page = await live().getPostInteractingUsers("p1", "commenters");

    expect(page.data[0]?.id).toBe("223214544");
  });

  it("sends the bearer token and sdk user agent", async () => {
    await live().searchUsers("travel");

    const headers = recorded.at(-1)?.headers;
    expect(headers?.authorization).toBe("Bearer test-key");
    expect(String(headers?.["user-agent"])).toMatch(/^xpoz-ts-sdk\//);
  });

  it("maps a 400 to ValidationError", async () => {
    await expect(live().searchPosts("")).rejects.toThrow(ValidationError);
  });

  it("maps a rejected key to AuthenticationError", async () => {
    await expect(live("wrong-key").searchUsers("travel")).rejects.toThrow(AuthenticationError);
  });
});
