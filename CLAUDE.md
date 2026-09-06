# CLAUDE.md

This file provides guidance to Claude Code when working with the xpoz-ts repository.

## Project Overview

TypeScript SDK for the Xpoz social media intelligence platform — wraps the xpoz-mcp server (MCP protocol) into a simple, typed async API.

## Repository Structure

```
xpoz-ts/
├── package.json            # Package config (tsup build, vitest tests)
├── tsconfig.json           # TypeScript config (ES2022, NodeNext modules, strict)
├── vitest.config.ts        # Test config (singleFork, 660s timeout)
├── README.md               # Documentation
└── src/
    ├── index.ts            # Public exports
    ├── version.ts          # VERSION string
    ├── client.ts           # XpozClient
    ├── pagination.ts       # PaginatedResult<T>
    ├── errors.ts           # Error hierarchy
    ├── version.ts          # VERSION string
    ├── cursor.ts           # CursorResult<T> for the live (cursor-paged) routes
    ├── rest/               # REST layer for the live routes (xpoz-api, not MCP)
    │   └── transport.ts    # fetch-based client + HTTP error mapping
    ├── mcp/                # MCP protocol layer
    │   ├── index.ts
    │   ├── transport.ts    # MCP Streamable HTTP transport wrapper
    │   └── polling.ts      # Operation polling (5s interval, configurable timeout)
    ├── transform/          # Response data processing
    │   ├── index.ts
    │   └── responseParser.ts # Response parsing helpers
    ├── config/             # Configuration values
    │   ├── index.ts
    │   ├── constants.ts    # DEFAULT_SERVER_URL, ENV vars, timeouts
    │   └── tools.ts        # MCP tool name constants
    ├── types/              # TypeScript interfaces
    │   ├── index.ts
    │   ├── common.ts       # PaginationInfo
    │   ├── twitter.ts      # TwitterPost, TwitterUser
    │   ├── instagram.ts    # InstagramPost, InstagramUser, InstagramComment
    │   └── reddit.ts       # RedditPost, RedditUser, RedditComment, RedditSubreddit, composites
    └── namespaces/         # Platform method groups
        ├── base.ts         # BaseNamespace (shared logic)
        ├── liveBase.ts     # LiveNamespace (shared cursor paging for the live routes)
        ├── twitter.ts      # TwitterNamespace (12 methods)
        ├── twitterLive.ts  # TwitterLiveNamespace (9 cursor-paged methods)
        ├── instagram.ts    # InstagramNamespace (9 methods)
        ├── instagramLive.ts # InstagramLiveNamespace (8 cursor-paged methods)
        └── reddit.ts       # RedditNamespace (9 methods)
```

## Development Commands

All commands run from the repo root. Requires Node.js 18+.

```bash
# Install dependencies
npm install

# Build (ESM + CJS + .d.ts)
npm run build

# Type check
npm run typecheck

# Verify imports
node -e "import('xpoz').then(m => console.log(Object.keys(m)))"
```

## Testing

Tests hit the live Xpoz API and require a valid API key:

```bash
XPOZ_API_KEY=your-api-key npm test
```

Tests must run in a **single sequential process** — `vitest.config.ts` enforces `singleFork: true`. The Xpoz API rate-limits concurrent connections, causing operations to queue beyond the timeout and cascade failures through the shared client.

The vitest timeout (660s) is intentionally higher than the client polling timeout (300s default) so the SDK raises a clean `OperationTimeoutError` instead of vitest killing the process.

## Architecture

### Transport Layer (`transport.ts`)

- `McpTransport`: Wraps MCP SDK's Streamable HTTP transport. Injects the API key as a Bearer token. Exposes `callTool(name, args) -> Promise<Record<string, unknown>>`.
- `connect()` must be called before any tool calls; `close()` tears down the session.

### Operation Polling (`polling.ts`)

Many xpoz-mcp tools return an `operationId` instead of immediate results (long-running queries). The poller:
- Calls `checkOperationStatus` every 5 seconds
- Returns result dict on `completed` status (or if `results`/`downloadUrl` present)
- Raises `OperationFailedError` / `OperationCancelledError` / `OperationTimeoutError`
- Default timeout: 300,000ms (configurable via `new XpozClient({ timeoutMs: N })`)

### Pagination (`pagination.ts`)

- `PaginatedResult<T>` wraps first-page data + `PaginationInfo` + a stored `fetchPage` callback
- `nextPage()`, `getPage(n)` fetch subsequent pages using `tableName` from the first response
- `exportCsv()` polls the export operation and returns a download URL

### Namespace Pattern

Each platform (Twitter, Instagram, Reddit) has a namespace class:
- Inherits `BaseNamespace` which provides `callAndMaybePoll()`, `buildArgs()`, `buildPaginatedResult()`
- `callAndMaybePoll()` handles `operationId` polling transparently
- `buildArgs()` filters out `undefined`/`null` values before sending to MCP

### Client Class (`client.ts`)

- `XpozClient`: Constructor accepts `{ apiKey?, serverUrl?, timeoutMs? }`. Reads `XPOZ_API_KEY` / `XPOZ_SERVER_URL` env vars as fallback.
- Must call `await client.connect()` before use.
- Supports `Symbol.asyncDispose` (`await using client = new XpozClient(...)`).
- Attaches `client.twitter`, `client.instagram`, `client.reddit` namespaces.

## Type Models

All types are plain TypeScript interfaces. All fields are optional (the API returns only requested fields). Fields are camelCase matching the MCP response format — no transformation is applied.

## Relationship to xpoz-mcp

This SDK is a client for the xpoz-mcp server. Key correspondences:

| SDK Concept | xpoz-mcp Source |
|---|---|
| Tool names (`tools.ts`) | `src/consts/tools.consts.ts` |
| Tweet fields | `src/entities/twitter/Tweet.ts` |
| TwitterUser fields | `src/entities/twitter/User.ts` |
| InstagramPost fields | `src/entities/instagram/Post.ts` |
| InstagramUser fields | `src/entities/instagram/User.ts` |
| InstagramComment fields | `src/entities/instagram/Comment.ts` |
| RedditPost fields | `src/entities/reddit/Post.ts` |
| RedditUser fields | `src/entities/reddit/User.ts` |
| RedditComment fields | `src/entities/reddit/Comment.ts` |
| RedditSubreddit fields | `src/entities/reddit/Subreddit.ts` |
| Operation protocol | `src/tools/operations.ts` |

When xpoz-mcp adds new fields or tools, update `tools.ts`, the relevant type interfaces, and the namespace method.

## MCP Tool Name Mapping

| SDK Method | MCP Tool |
|---|---|
| `twitter.getPostsByIds()` | `getTwitterPostsByIds` |
| `twitter.getPostsByAuthor()` | `getTwitterPostsByAuthor` |
| `twitter.searchPosts()` | `getTwitterPostsByKeywords` |
| `twitter.getRetweets()` | `getTwitterPostRetweets` |
| `twitter.getQuotes()` | `getTwitterPostQuotes` |
| `twitter.getComments()` | `getTwitterPostComments` |
| `twitter.getPostInteractingUsers()` | `getTwitterPostInteractingUsers` |
| `twitter.countPosts()` | `countTweets` |
| `twitter.getUser()` | `getTwitterUser` |
| `twitter.searchUsers()` | `searchTwitterUsers` |
| `twitter.getUserConnections()` | `getTwitterUserConnections` |
| `twitter.getUsersByKeywords()` | `getTwitterUsersByKeywords` |
| `instagram.getPostsByIds()` | `getInstagramPostsByIds` |
| `instagram.getPostsByUser()` | `getInstagramPostsByUser` |
| `instagram.searchPosts()` | `getInstagramPostsByKeywords` |
| `instagram.getComments()` | `getInstagramCommentsByPostId` |
| `instagram.getUser()` | `getInstagramUser` |
| `instagram.searchUsers()` | `searchInstagramUsers` |
| `instagram.getUserConnections()` | `getInstagramUserConnections` |
| `instagram.getPostInteractingUsers()` | `getInstagramPostInteractingUsers` |
| `instagram.getUsersByKeywords()` | `getInstagramUsersByKeywords` |
| `reddit.searchPosts()` | `getRedditPostsByKeywords` |
| `reddit.getPostWithComments()` | `getRedditPostWithCommentsById` |
| `reddit.searchComments()` | `getRedditCommentsByKeywords` |
| `reddit.getCommentById()` | `getRedditCommentById` |
| `reddit.getUser()` | `getRedditUser` |
| `reddit.searchUsers()` | `searchRedditUsers` |
| `reddit.getUsersByKeywords()` | `getRedditUsersByKeywords` |
| `reddit.searchSubreddits()` | `searchRedditSubreddits` |
| `reddit.getSubredditWithPosts()` | `getRedditSubredditWithPostsByName` |
| `reddit.getSubredditsByKeywords()` | `getRedditSubredditsByKeywords` |

## Two Backends

Most namespaces call **xpoz-mcp** over MCP protocol (`mcp.xpoz.ai`). The `instagramLive` and `twitterLive` namespaces are different: they call **xpoz-api** over plain HTTP (`api.xpoz.ai`, override with `XPOZ_API_URL`), because the `/live` routes exist only there and xpoz-mcp does not expose them as tools.

Both share the same API key. The REST namespace is created lazily and needs no `connect()` — MCP-only users pay nothing for it, and live-only users never open an MCP session.

Live routes bypass the database and page with an opaque cursor, so they return `CursorResult` rather than `PaginatedResult` — forward-only, no page numbers or totals. Drive iteration off `hasMore` and the cursor, never the item count: upstream may return a short or empty page while `hasMore` is true.

`liveBase.ts` coerces integer `id`/`userId`/`postId`/`authorId` values to strings, because `/v2/post/commenters` returns numeric ids while the models type them as strings.

| Live route | Upstream (via xpoz-api) |
|---|---|
| `twitterLive.searchPosts()` | `/v2/search/tweets` |
| `twitterLive.getPostsByUser()` | `/v2/user/tweets` |
| `twitterLive.getPost()` | `/v2/tweet` |
| `twitterLive.getComments()` | `/v2/tweet/comments` |
| `twitterLive.getQuotes()` | `/v2/tweet/quotes` |
| `twitterLive.getPostInteractingUsers()` | `/v2/tweet/commenters`, `/v2/tweet/quoters`, `/v2/tweet/retweeters` |
| `twitterLive.searchUsers()` | `/v2/search/users` |
| `twitterLive.getUser()` | `/v2/user` |
| `twitterLive.getUserConnections()` | `/v2/user/followers`, `/v2/user/following` |

## Conventions

- All public APIs use camelCase (TypeScript standard)
- All type models live in `types/` — never define types in namespace or client files
- All type fields are optional (API returns only requested fields)
- `buildArgs()` strips `undefined`/`null` — never send empty fields to MCP
- Dates passed as `string` in `YYYY-MM-DD` format (matching xpoz-mcp)
- Build output is dual CJS + ESM via tsup (`dist/index.cjs`, `dist/index.js`)
- `strict: true` in tsconfig — no implicit any, strict null checks enforced
