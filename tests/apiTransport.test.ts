import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiTransport } from "../src/api/transport.js";
import { XpozClient } from "../src/client.js";
import {
  AuthenticationError,
  NotSupportedError,
} from "../src/errors.js";

interface RecordedCall {
  url: URL;
  init?: RequestInit;
}

function createTransport(
  body: unknown = { results: [] },
  status = 200
): { transport: ApiTransport; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url: new URL(url), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  const transport = new ApiTransport("https://api.example.com", "test-key", fetchFn);
  return { transport, calls };
}

describe("ApiTransport routing", () => {
  it("maps getTwitterPostsByKeywords to GET /posts with renamed params", async () => {
    const { transport, calls } = createTransport();
    await transport.callTool("getTwitterPostsByKeywords", {
      query: "hello world",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
      language: "en",
      fields: ["id", "text"],
      limit: 5,
      responseType: "paging",
      pageNumber: 2,
    });
    const { url } = calls[0];
    expect(url.pathname).toBe("/api/data/twitter/posts");
    expect(url.searchParams.get("q")).toBe("hello world");
    expect(url.searchParams.get("since")).toBe("2026-01-01");
    expect(url.searchParams.get("until")).toBe("2026-02-01");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("fields")).toBe("id,text");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("responseType")).toBe("paging");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("maps getTwitterPostsByIds postIds array to ids csv", async () => {
    const { transport, calls } = createTransport();
    await transport.callTool("getTwitterPostsByIds", { postIds: ["1", "2"] });
    expect(calls[0].url.pathname).toBe("/api/data/twitter/posts");
    expect(calls[0].url.searchParams.get("ids")).toBe("1,2");
  });

  it("maps getTwitterPostsByAuthor username to author", async () => {
    const { transport, calls } = createTransport();
    await transport.callTool("getTwitterPostsByAuthor", { username: "alice" });
    expect(calls[0].url.searchParams.get("author")).toBe("alice");
    expect(calls[0].url.searchParams.get("username")).toBeNull();
  });

  it("puts postId in the path for retweets, quotes, comments, interacting-users", async () => {
    const cases: Array<[string, string]> = [
      ["getTwitterPostRetweets", "/api/data/twitter/posts/123/retweets"],
      ["getTwitterPostQuotes", "/api/data/twitter/posts/123/quotes"],
      ["getTwitterPostComments", "/api/data/twitter/posts/123/comments"],
      ["getTwitterPostInteractingUsers", "/api/data/twitter/posts/123/interacting-users"],
    ];
    for (const [toolName, expectedPath] of cases) {
      const { transport, calls } = createTransport();
      await transport.callTool(toolName, { postId: "123", interactionType: "likes" });
      expect(calls[0].url.pathname).toBe(expectedPath);
      expect(calls[0].url.searchParams.get("postId")).toBeNull();
    }
  });

  it("maps countTweets to /posts/count", async () => {
    const { transport, calls } = createTransport({ results: [{ count: 7 }] });
    await transport.callTool("countTweets", { phrase: "xpoz", startDate: "2026-01-01" });
    expect(calls[0].url.pathname).toBe("/api/data/twitter/posts/count");
    expect(calls[0].url.searchParams.get("phrase")).toBe("xpoz");
    expect(calls[0].url.searchParams.get("since")).toBe("2026-01-01");
  });

  it("maps getTwitterUsersByKeywords to /users", async () => {
    const { transport, calls } = createTransport();
    await transport.callTool("getTwitterUsersByKeywords", { query: "founders" });
    expect(calls[0].url.pathname).toBe("/api/data/twitter/users");
    expect(calls[0].url.searchParams.get("q")).toBe("founders");
  });

  it("maps getTwitterUserConnections username into the path", async () => {
    const { transport, calls } = createTransport();
    await transport.callTool("getTwitterUserConnections", {
      username: "alice",
      connectionType: "followers",
    });
    expect(calls[0].url.pathname).toBe("/api/data/twitter/users/alice/connections");
    expect(calls[0].url.searchParams.get("connectionType")).toBe("followers");
  });

  it("maps checkOperationStatus to /operations/:id", async () => {
    const { transport, calls } = createTransport({ status: "success", results: [] });
    await transport.callTool("checkOperationStatus", { operationId: "op_1" });
    expect(calls[0].url.pathname).toBe("/api/data/twitter/operations/op_1");
  });

  it("sends bearer auth and user-agent headers", async () => {
    const { transport, calls } = createTransport();
    await transport.callTool("countTweets", { phrase: "x" });
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-key");
    expect(headers["User-Agent"]).toMatch(/^xpoz-ts-sdk\//);
  });

  it("returns the parsed response body", async () => {
    const { transport } = createTransport({ results: [{ id: "1" }], count: 1 });
    const result = await transport.callTool("countTweets", { phrase: "x" });
    expect(result).toEqual({ results: [{ id: "1" }], count: 1 });
  });
});

describe("ApiTransport unsupported surface", () => {
  it("throws NotSupportedError for tools without an API route", async () => {
    const { transport } = createTransport();
    const unsupportedTools = [
      "getTwitterUser",
      "getTwitterUsers",
      "searchTwitterUsers",
      "getInstagramUser",
      "getTrackedItems",
    ];
    for (const toolName of unsupportedTools) {
      await expect(transport.callTool(toolName, {})).rejects.toBeInstanceOf(NotSupportedError);
    }
  });

  it("throws NotSupportedError for search args the API does not accept", async () => {
    const { transport } = createTransport();
    await expect(
      transport.callTool("getTwitterPostsByKeywords", { query: "x", authorUsername: "alice" })
    ).rejects.toBeInstanceOf(NotSupportedError);
    await expect(
      transport.callTool("getTwitterUsersByKeywords", { query: "x", startDate: "2026-01-01" })
    ).rejects.toBeInstanceOf(NotSupportedError);
  });
});

describe("ApiTransport error handling", () => {
  it("throws AuthenticationError on 401", async () => {
    const { transport } = createTransport({ message: "unauthorized" }, 401);
    await expect(transport.callTool("countTweets", { phrase: "x" })).rejects.toBeInstanceOf(
      AuthenticationError
    );
  });

  it("throws ApiRequestError with the API error message on other non-2xx", async () => {
    const { transport } = createTransport(
      { success: false, message: "Failed to count tweets", error: "phrase is required" },
      400
    );
    await expect(transport.callTool("countTweets", { phrase: "x" })).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 400,
      apiError: "phrase is required",
    });
  });
});

describe("XpozClient in API mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes twitter calls through the REST API", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ results: [{ count: 3 }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new XpozClient({
      apiKey: "test-key",
      transport: "api",
      versionCheck: false,
    });
    await client.connect();
    const count = await client.twitter.countPosts("xpoz");
    expect(count).toBe(3);
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.origin).toBe("https://api.xpoz.ai");
    expect(calledUrl.pathname).toBe("/api/data/twitter/posts/count");
    await client.close();
  });

  it("rejects unsupported namespaces with NotSupportedError", async () => {
    const client = new XpozClient({
      apiKey: "test-key",
      transport: "api",
      versionCheck: false,
    });
    await client.connect();
    await expect(client.instagram.getUser("someone")).rejects.toBeInstanceOf(NotSupportedError);
  });
});
