import * as tools from "../config/tools.js";
import { VERSION } from "../version.js";
import {
  ApiRequestError,
  AuthenticationError,
  NotSupportedError,
  XpozConnectionError,
} from "../errors.js";
import { createProxyFetch, getProxyUrl } from "../mcp/transport.js";

type RawDict = Record<string, unknown>;
type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const USER_AGENT = `xpoz-ts-sdk/${VERSION}`;
const TWITTER_DATA_BASE_PATH = "/api/data/twitter";
const CHECK_OPERATION_STATUS = "checkOperationStatus";

const QUERY_PARAM_RENAMES: Record<string, string> = {
  startDate: "since",
  endDate: "until",
  language: "lang",
  pageNumber: "page",
  query: "q",
  postIds: "ids",
};

interface Route {
  path: string;
  queryArgs: RawDict;
}

function popParam(args: RawDict, key: string): { value: string; rest: RawDict } {
  const { [key]: value, ...rest } = args;
  return { value: String(value ?? ""), rest };
}

function rejectUnsupportedArgs(toolName: string, args: RawDict, keys: string[]): void {
  for (const key of keys) {
    if (args[key] !== undefined && args[key] !== null) {
      throw new NotSupportedError(`${toolName} option '${key}'`);
    }
  }
}

function postRelationRoute(relation: string): (args: RawDict) => Route {
  return (args) => {
    const { value: postId, rest } = popParam(args, "postId");
    return { path: `/posts/${encodeURIComponent(postId)}/${relation}`, queryArgs: rest };
  };
}

const ROUTE_BUILDERS: Record<string, (args: RawDict) => Route> = {
  [tools.GET_TWITTER_POSTS_BY_IDS]: (args) => ({ path: "/posts", queryArgs: args }),
  [tools.GET_TWITTER_POSTS_BY_AUTHOR]: (args) => {
    const { value: username, rest } = popParam(args, "username");
    return { path: "/posts", queryArgs: { ...rest, author: username } };
  },
  [tools.SEARCH_TWITTER_POSTS]: (args) => {
    rejectUnsupportedArgs(tools.SEARCH_TWITTER_POSTS, args, [
      "authorUsername",
      "authorId",
      "filterOutRetweets",
    ]);
    return { path: "/posts", queryArgs: args };
  },
  [tools.GET_TWITTER_RETWEETS]: postRelationRoute("retweets"),
  [tools.GET_TWITTER_QUOTES]: postRelationRoute("quotes"),
  [tools.GET_TWITTER_COMMENTS]: postRelationRoute("comments"),
  [tools.GET_TWITTER_POST_INTERACTING_USERS]: postRelationRoute("interacting-users"),
  [tools.COUNT_TWEETS]: (args) => ({ path: "/posts/count", queryArgs: args }),
  [tools.GET_TWITTER_USERS_BY_KEYWORDS]: (args) => {
    rejectUnsupportedArgs(tools.GET_TWITTER_USERS_BY_KEYWORDS, args, [
      "startDate",
      "endDate",
      "language",
    ]);
    return { path: "/users", queryArgs: args };
  },
  [tools.GET_TWITTER_USER_CONNECTIONS]: (args) => {
    const { value: username, rest } = popParam(args, "username");
    return { path: `/users/${encodeURIComponent(username)}/connections`, queryArgs: rest };
  },
  [CHECK_OPERATION_STATUS]: (args) => {
    const { value: operationId, rest } = popParam(args, "operationId");
    return { path: `/operations/${encodeURIComponent(operationId)}`, queryArgs: rest };
  },
};

function buildQueryString(queryArgs: RawDict): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryArgs)) {
    if (value === undefined || value === null) {
      continue;
    }
    const paramName = QUERY_PARAM_RENAMES[key] ?? key;
    const paramValue = Array.isArray(value) ? value.join(",") : String(value);
    params.set(paramName, paramValue);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export class ApiTransport {
  private baseUrl: string;
  private apiKey: string;
  private fetchFn: FetchFn | null;

  constructor(serverUrl: string, apiKey: string, fetchFn?: FetchFn) {
    this.baseUrl = serverUrl.replace(/\/+$/, "") + TWITTER_DATA_BASE_PATH;
    this.apiKey = apiKey;
    this.fetchFn = fetchFn ?? null;
  }

  async connect(): Promise<void> {}

  async close(): Promise<void> {}

  async callTool(name: string, args: RawDict): Promise<RawDict> {
    const buildRoute = ROUTE_BUILDERS[name];
    if (!buildRoute) {
      throw new NotSupportedError(name);
    }

    const route = buildRoute({ ...args });
    const url = this.baseUrl + route.path + buildQueryString(route.queryArgs);
    const fetchFn = await this.resolveFetch();

    let response: Response;
    try {
      response = await fetchFn(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": USER_AGENT,
        },
      });
    } catch (error) {
      throw new XpozConnectionError(`Failed to reach the Xpoz API: ${String(error)}`);
    }

    const body = (await response.json().catch(() => ({}))) as RawDict;

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(
        `Xpoz API rejected the API key (${response.status}). ` +
          `Get your token at http://xpoz.ai/get-token?utm_source=ts_sdk&utm_medium=sdk`
      );
    }

    if (!response.ok) {
      throw new ApiRequestError(
        response.status,
        String(body["error"] ?? body["message"] ?? response.statusText)
      );
    }

    return body;
  }

  private async resolveFetch(): Promise<FetchFn> {
    if (!this.fetchFn) {
      const proxyUrl = getProxyUrl();
      this.fetchFn = proxyUrl
        ? ((await createProxyFetch(proxyUrl)) as unknown as FetchFn)
        : (fetch as FetchFn);
    }
    return this.fetchFn;
  }
}
