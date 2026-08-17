# Xpoz TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@xpoz/xpoz)](https://www.npmjs.com/package/@xpoz/xpoz)

TypeScript SDK for the [Xpoz](https://xpoz.ai) social media intelligence platform. Query Twitter/X, Instagram, Reddit, and TikTok data through a simple, typed interface.

## Installation

```bash
npm install @xpoz/xpoz
```

Requires Node.js 18+.

## Get an API Key

Sign up and get your token at **https://xpoz.ai/get-token**.

Once you have it, pass it directly or set the `XPOZ_API_KEY` environment variable:

```bash
export XPOZ_API_KEY=your-token-here
```

## What is Xpoz?

Xpoz provides unified access to social media data across Twitter/X, Instagram, Reddit, and TikTok. The platform indexes billions of posts, user profiles, and engagement metrics — making it possible to search, analyze, and export social media data at scale.

The SDK wraps Xpoz's [MCP](https://modelcontextprotocol.io) server, abstracting away transport, authentication, operation polling, and pagination into a clean developer-friendly API.

## Features

- **42 data methods** across Twitter, Instagram, Reddit, and TikTok
- **Fully async** — all methods return `Promise<T>`
- **Automatic operation polling** — long-running queries are abstracted away
- **Response types** — choose between fast (immediate), paging (full pagination), or CSV export
- **Server-side pagination** — `PaginatedResult<T>` with `nextPage()`, `getPage(n)`
- **CSV export** — `exportCsv()` on any paginated result
- **Field selection** — request only the fields you need
- **TypeScript-first** — fully typed results with autocomplete support
- **Namespaced API** — `client.twitter.*`, `client.instagram.*`, `client.reddit.*`, `client.tiktok.*`, `client.tracking.*`

## Quick Start

```typescript
import { XpozClient, ResponseType } from "@xpoz/xpoz";

const client = new XpozClient({ apiKey: "your-api-key" });
await client.connect();

const user = await client.twitter.getUser("elonmusk");
console.log(`${user.name} — ${user.followersCount?.toLocaleString()} followers`);

const results = await client.twitter.searchPosts("artificial intelligence", {
  startDate: "2025-01-01",
});
for (const post of results.data) {
  console.log(post.text, post.likeCount);
}

await client.close();
```

## Authentication

Get your API key at https://xpoz.ai/get-token, then use it as follows:

```typescript
// Pass API key directly
const client = new XpozClient({ apiKey: "your-api-key" });

// Or use XPOZ_API_KEY environment variable
const client = new XpozClient();

// Custom server URL (also reads XPOZ_SERVER_URL env var)
const client = new XpozClient({ apiKey: "your-api-key", serverUrl: "https://xpoz.ai/mcp" });

// Custom operation timeout in milliseconds (default: 300000)
const client = new XpozClient({ apiKey: "your-api-key", timeoutMs: 600_000 });
```

### Trial Access (No Sign-Up Required)

Want to try the SDK before signing up? Mint a free trial token (no account needed, valid for 5 days):

```bash
curl -X POST https://api.xpoz.ai/api/trial/token \
  -H "Content-Type: application/json" \
  -d '{"source": "sdk"}'
# -> { "success": true, "data": { "accessKey": "TRIAL...", "expiresInSeconds": 432000 }, ... }
```

The `source` field is required — it identifies where the trial token request came from (e.g. `skills`, a specific page, `sdk`, `cli`).

Then use the returned token (it starts with `TRIAL`) as your API key:

```typescript
// Optional: try without your own account
const client = new XpozClient({
  apiKey: "TRIAL...", // the token from the curl response above
});
await client.connect();

const user = await client.twitter.getUser("elonmusk");
```

The trial token is rate-limited and intentionally restricted:

- **Read-only data tools only** — search and lookup methods across Twitter, Instagram, Reddit, and TikTok. Account, tracking, and operation-management methods are not available and return an upgrade prompt.
- **Up to 5 results per call** — every response is capped at 5 items. `responseType` is forced to `ResponseType.FAST`, so pagination (`PAGING`) and CSV export (`CSV`) are unavailable.
- **Cached data only** — trial reads from the database and does not trigger live on-demand crawling, so the very latest posts may not appear.

For full result limits, pagination, CSV export, and live data, [get your own API key](https://xpoz.ai/get-token).

## Async Disposal

```typescript
// Using Symbol.asyncDispose (Node.js 18.2+ with --experimental-vm-modules or TypeScript 5.2+)
await using client = new XpozClient({ apiKey: "your-api-key" });
await client.connect();
const user = await client.twitter.getUser("elonmusk");
// client.close() is called automatically

// Manual connect/close
const client = new XpozClient({ apiKey: "your-api-key" });
await client.connect();
try {
  const results = await client.twitter.searchPosts("AI");
} finally {
  await client.close();
}
```

## Pagination

Methods that return large datasets use server-side pagination (100 items per page). These return a `PaginatedResult<T>` with built-in helpers:

```typescript
const results = await client.twitter.searchPosts("AI");

results.data                        // TwitterPost[] — current page
results.pagination.totalRows        // total matching rows
results.pagination.totalPages       // total pages
results.pagination.pageNumber       // current page number
results.pagination.pageSize         // items per page (100)
results.pagination.resultsCount     // items on current page
results.hasNextPage()               // boolean

// Navigate pages
const page2 = await results.nextPage();     // fetch next page
const page5 = await results.getPage(5);     // jump to specific page

// Export to CSV
const csvUrl = await results.exportCsv();   // returns download URL
```

## Live Data — `client.instagramLive`

Instagram live methods bypass the database and fetch straight from the crawler API, so results are always current. They page with an opaque **cursor** rather than page numbers, and return a `CursorResult<T>`:

```typescript
const page = await client.instagramLive.searchPosts("travel", { fields: ["id", "caption"] });

page.data;             // InstagramPost[] — this page
page.hasMore;          // another page is available upstream
page.nextPageCursor;   // opaque token for the next call
page.hasNextPage();    // boolean

const next = await page.nextPage();

// Walk every page
for await (const post of page.items()) {
  console.log(post.id);
}
```

Cursor paging is forward-only: there is no `getPage(n)`, `totalPages`, or `totalRows`, because the upstream API does not report them. Drive iteration off `hasMore` and the cursor — never off the item count, since a page can be short or empty while `hasMore` is still true.

These routes talk to the Xpoz REST API rather than the MCP server, so **`connect()` is not required** to use them. Override the base URL with `new XpozClient({ apiUrl })` or the `XPOZ_API_URL` environment variable.

They always trigger a live fetch, so they are **not available on trial access** and throw `AuthenticationError` (HTTP 403).

| Method | Returns |
|---|---|
| `searchPosts(query, options?)` | `CursorResult<InstagramPost>` |
| `getPostsByUser(identifier, options?)` | `CursorResult<InstagramPost>` |
| `getPost(postId, options?)` | `InstagramPost \| null` |
| `getComments(postId, options?)` | `CursorResult<InstagramComment>` |
| `getPostInteractingUsers(postId, interactionType, options?)` | `CursorResult<InstagramUser>` |
| `searchUsers(name, options?)` | `CursorResult<InstagramUser>` |
| `getUser(identifier, options?)` | `InstagramUser \| null` |
| `getUserConnections(identifier, connectionType, options?)` | `CursorResult<InstagramUser>` |

`interactionType` is `"commenters"` or `"likers"`; `connectionType` is `"followers"` or `"following"`.

## Field Selection

All methods accept a `fields` option. Use camelCase field names.

```typescript
// Only fetch the fields you need (faster + less memory)
const results = await client.twitter.searchPosts("AI", {
  fields: ["id", "text", "likeCount", "retweetCount", "createdAtDate"],
});

const user = await client.twitter.getUser("elonmusk", {
  fields: ["id", "username", "name", "followersCount", "description"],
});
```

Requesting fewer fields significantly improves response time.

## Response Types

Search and query methods support a `responseType` option that controls how results are returned. Import the `ResponseType` enum:

```typescript
import { XpozClient, ResponseType } from "@xpoz/xpoz";
```

| Mode | Enum Value | Behavior | Best For |
| --- | --- | --- | --- |
| **Fast** | `ResponseType.Fast` | Returns up to 300 results immediately, no async polling (default) | Quick queries, UI previews |
| **Paging** | `ResponseType.Paging` | Async paginated query with full dataset access | Full analysis, large datasets |
| **CSV** | `ResponseType.Csv` | Async bulk export, use `exportCsv()` to get download URL | Data exports |

### Fast mode (default)

The default behavior. Returns results immediately without polling. Use `limit` to constrain the number of results (max 300):

```typescript
const results = await client.twitter.searchPosts("bitcoin", {
  startDate: "2025-01-01",
  responseType: ResponseType.Fast,
  limit: 50,
});
console.log(results.data.length); // up to 50 results, returned immediately
```

### Paging mode

Returns paginated results with full `totalRows`, `totalPages`, and `tableName` for cursor-based navigation:

```typescript
const results = await client.twitter.searchPosts("bitcoin", {
  startDate: "2025-01-01",
  responseType: ResponseType.Paging, // optional — this is the default
});
console.log(results.pagination.totalRows);  // total matching rows
if (results.hasNextPage()) {
  const page2 = await results.nextPage();
}
```

### CSV mode

Initiates an async export. Call `exportCsv()` on the result to poll the export operation and get a download URL:

```typescript
const results = await client.twitter.searchPosts("bitcoin", {
  startDate: "2025-01-01",
  responseType: ResponseType.Csv,
});
const downloadUrl = await results.exportCsv();
console.log(downloadUrl); // URL to download the CSV file
```

### Methods supporting `responseType` and `limit`

The following methods accept both `responseType` and `limit`:

- `twitter.getPostsByAuthor()`, `twitter.searchPosts()`, `twitter.getUsersByKeywords()`
- `instagram.getPostsByUser()`, `instagram.searchPosts()`, `instagram.getUsersByKeywords()`
- `reddit.searchPosts()`
- `tiktok.getPostsByUser()`, `tiktok.searchPosts()`, `tiktok.getUsersByKeywords()`, `tiktok.getPostsByHashtags()`, `tiktok.getUsersByHashtags()`, `tiktok.getPostsBySound()`

These methods accept `limit` only:

- `twitter.searchUsers()`, `instagram.searchUsers()`, `reddit.searchUsers()`, `reddit.searchSubreddits()`
- `tiktok.searchUsers()`, `tiktok.searchSounds()`

## Query Syntax

The `query` parameter on all `search*` and `get*ByKeywords` methods supports a Lucene-style full-text syntax across Twitter, Instagram, and Reddit.

### Exact phrase
Wrap in double quotes to require an exact match:
```
"machine learning"
"climate change"
```

### Keywords (any word)
Space-separated terms without quotes match posts containing **any** of the words:
```
AI crypto blockchain
```

### Boolean operators
Use `AND`, `OR`, `NOT` (case-insensitive). A bare space is treated as `OR` — be explicit:
```
"deep learning" AND python
tensorflow OR pytorch
climate NOT politics
```

### Grouping with parentheses
```
(AI OR "artificial intelligence") AND ethics
(startup OR entrepreneur) NOT "venture capital"
```

### Combined example
```typescript
const results = await client.twitter.searchPosts(
  '("machine learning" OR "deep learning") AND python NOT spam',
  {
    startDate: "2025-01-01",
    language: "en",
  }
);
```

> **Note:** Do not use `from:`, `lang:`, `since:`, or `until:` in the query string — use the dedicated parameters (`authorUsername`, `language`, `startDate`, `endDate`) instead.

## Error Handling

```typescript
import {
  XpozError,
  AuthenticationError,
  XpozConnectionError,
  OperationTimeoutError,
  OperationFailedError,
  OperationCancelledError,
  ResponseType,
} from "@xpoz/xpoz";

try {
  const user = await client.twitter.getUser("nonexistent_user_12345");
} catch (e) {
  if (e instanceof OperationFailedError) {
    console.log(`Operation ${e.operationId} failed: ${e.operationError}`);
  } else if (e instanceof OperationTimeoutError) {
    console.log(`Timed out after ${Math.round(e.elapsedMs / 1000)}s`);
  } else if (e instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (e instanceof XpozError) {
    console.log(`Xpoz error: ${e.message}`);
  }
}
```

---

## API Reference

### Twitter — `client.twitter`

#### `getUser(identifier, options?) -> Promise<TwitterUser>`

Get a single Twitter user profile.

```typescript
// By username (default)
const user = await client.twitter.getUser("elonmusk");

// By numeric ID
const user = await client.twitter.getUser("44196397", { identifierType: "id" });
```

#### `searchUsers(name, options?) -> Promise<TwitterUser[]>`

Search users by name or username. Returns up to 10 results by default. Use `limit` to adjust.

```typescript
const users = await client.twitter.searchUsers("elon");
const topFive = await client.twitter.searchUsers("elon", { limit: 5 });
```

#### `getUserConnections(username, connectionType, options?) -> Promise<PaginatedResult<TwitterUser>>`

Get followers or following for a user.

```typescript
const followers = await client.twitter.getUserConnections("elonmusk", "followers");
const following = await client.twitter.getUserConnections("elonmusk", "following");
```

#### `getUsersByKeywords(query, options?) -> Promise<PaginatedResult<TwitterUser>>`

Find users who authored posts matching a keyword query. Supports `responseType` and `limit`.

```typescript
const users = await client.twitter.getUsersByKeywords('"machine learning"', {
  fields: ["username", "name", "followersCount"],
  responseType: ResponseType.Fast,
  limit: 20,
});
```

#### `getPostsByIds(postIds, options?) -> Promise<TwitterPost[]>`

Get 1-100 posts by their IDs.

```typescript
const tweets = await client.twitter.getPostsByIds(["1234567890", "0987654321"]);
```

#### `getPostsByAuthor(identifier, options?) -> Promise<PaginatedResult<TwitterPost>>`

Get all posts by an author with optional date filtering. Supports `responseType` and `limit`.

```typescript
const results = await client.twitter.getPostsByAuthor("elonmusk", {
  startDate: "2025-01-01",
  responseType: ResponseType.Fast,
  limit: 100,
});
```

#### `searchPosts(query, options?) -> Promise<PaginatedResult<TwitterPost>>`

Full-text search with filters. Supports exact phrases (`"machine learning"`), boolean operators (`AI AND python`), and parentheses. Supports `responseType` and `limit`.

```typescript
const results = await client.twitter.searchPosts('"artificial intelligence" AND ethics', {
  startDate: "2025-01-01",
  endDate: "2025-06-01",
  language: "en",
  fields: ["id", "text", "likeCount", "authorUsername", "createdAtDate"],
  responseType: ResponseType.Fast,
  limit: 50,
});
```

#### `getRetweets(postId, options?) -> Promise<PaginatedResult<TwitterPost>>`

Get retweets of a specific post (database only).

```typescript
const retweets = await client.twitter.getRetweets("1234567890");
```

#### `getQuotes(postId, options?) -> Promise<PaginatedResult<TwitterPost>>`

Get quote tweets of a specific post.

```typescript
const quotes = await client.twitter.getQuotes("1234567890");
```

#### `getComments(postId, options?) -> Promise<PaginatedResult<TwitterPost>>`

Get replies to a specific post.

```typescript
const comments = await client.twitter.getComments("1234567890");
```

#### `getPostInteractingUsers(postId, interactionType, options?) -> Promise<PaginatedResult<TwitterUser>>`

Get users who interacted with a post. `interactionType`: `"commenters"`, `"quoters"`, `"retweeters"`.

```typescript
const commenters = await client.twitter.getPostInteractingUsers("1234567890", "commenters");
```

#### `countPosts(phrase, options?) -> Promise<number>`

Count tweets containing a phrase within a date range.

```typescript
const count = await client.twitter.countPosts("bitcoin", { startDate: "2025-01-01" });
console.log(`${count.toLocaleString()} tweets mention bitcoin`);
```

---

### Instagram — `client.instagram`

#### `getUser(identifier, options?) -> Promise<InstagramUser>`

```typescript
const user = await client.instagram.getUser("instagram");
console.log(`${user.fullName} — ${user.followerCount?.toLocaleString()} followers`);
```

#### `searchUsers(name, options?) -> Promise<InstagramUser[]>`

Search users by name. Use `limit` to adjust the number of results.

```typescript
const users = await client.instagram.searchUsers("nasa");
const topThree = await client.instagram.searchUsers("nasa", { limit: 3 });
```

#### `getUserConnections(username, connectionType, options?) -> Promise<PaginatedResult<InstagramUser>>`

```typescript
const followers = await client.instagram.getUserConnections("instagram", "followers");
```

#### `getUsersByKeywords(query, options?) -> Promise<PaginatedResult<InstagramUser>>`

Find users who authored posts matching a keyword query. Supports `responseType` and `limit`.

```typescript
const users = await client.instagram.getUsersByKeywords('"sustainable fashion"', {
  responseType: ResponseType.Fast,
  limit: 20,
});
```

#### `getPostsByIds(postIds, options?) -> Promise<InstagramPost[]>`

Post IDs must be in strong_id format: `"media_id_user_id"` (e.g. `"3606450040306139062_4836333238"`).

```typescript
const posts = await client.instagram.getPostsByIds(["3606450040306139062_4836333238"]);
```

#### `getPostsByUser(identifier, options?) -> Promise<PaginatedResult<InstagramPost>>`

Get all posts by a user. Supports `responseType` and `limit`.

```typescript
const results = await client.instagram.getPostsByUser("nasa", {
  responseType: ResponseType.Fast,
  limit: 50,
});
```

#### `searchPosts(query, options?) -> Promise<PaginatedResult<InstagramPost>>`

Full-text search with filters. Supports `responseType` and `limit`.

```typescript
const results = await client.instagram.searchPosts("travel photography", {
  responseType: ResponseType.Fast,
  limit: 30,
});
```

#### `getComments(postId, options?) -> Promise<PaginatedResult<InstagramComment>>`

```typescript
const comments = await client.instagram.getComments("3606450040306139062_4836333238");
```

#### `getPostInteractingUsers(postId, interactionType, options?) -> Promise<PaginatedResult<InstagramUser>>`

`interactionType`: `"commenters"`, `"likers"`.

```typescript
const likers = await client.instagram.getPostInteractingUsers(
  "3606450040306139062_4836333238",
  "likers"
);
```

---

### Reddit — `client.reddit`

#### `getUser(username, options?) -> Promise<RedditUser>`

```typescript
const user = await client.reddit.getUser("spez");
console.log(`${user.username} — ${user.totalKarma?.toLocaleString()} karma`);
```

#### `searchUsers(name, options?) -> Promise<RedditUser[]>`

Search users by name. Use `limit` to adjust the number of results.

```typescript
const users = await client.reddit.searchUsers("spez");
const topThree = await client.reddit.searchUsers("spez", { limit: 3 });
```

#### `getUsersByKeywords(query, options?) -> Promise<PaginatedResult<RedditUser>>`

```typescript
const users = await client.reddit.getUsersByKeywords('"machine learning"', {
  subreddit: "MachineLearning",
});
```

#### `searchPosts(query, options?) -> Promise<PaginatedResult<RedditPost>>`

`sort`: `"relevance"`, `"hot"`, `"top"`, `"new"`, `"comments"`. `time`: `"hour"`, `"day"`, `"week"`, `"month"`, `"year"`, `"all"`. Supports `responseType` and `limit`.

```typescript
const results = await client.reddit.searchPosts("python tutorial", {
  subreddit: "learnpython",
  sort: "top",
  time: "month",
  responseType: ResponseType.Fast,
  limit: 25,
});
```

#### `getPostWithComments(postId, options?) -> Promise<RedditPostWithComments>`

Returns an object with the post and its comments.

```typescript
const result = await client.reddit.getPostWithComments("abc123");
console.log(result.post.title);
for (const comment of result.comments) {
  console.log(`  ${comment.authorUsername}: ${comment.body?.slice(0, 80)}`);
}
```

#### `searchComments(query, options?) -> Promise<PaginatedResult<RedditComment>>`

```typescript
const comments = await client.reddit.searchComments("helpful tip", {
  subreddit: "LifeProTips",
});
```

#### `getCommentById(commentId, options?) -> Promise<RedditComment>`

Fetch a single Reddit comment by its id (bare base36 or `t1_`-prefixed). Database-first with live API fallback when the comment is missing or stale.

```typescript
const comment = await client.reddit.getCommentById("laz1ytq", {
  fields: ["id", "body", "rank", "removal"],
});
```

#### `searchSubreddits(query, options?) -> Promise<RedditSubreddit[]>`

Search subreddits by name. Use `limit` to adjust the number of results.

```typescript
const subs = await client.reddit.searchSubreddits("machine learning");
const topFive = await client.reddit.searchSubreddits("machine learning", { limit: 5 });
```

#### `getSubredditWithPosts(subredditName, options?) -> Promise<SubredditWithPosts>`

```typescript
const result = await client.reddit.getSubredditWithPosts("wallstreetbets");
console.log(`r/${result.subreddit.displayName} — ${result.subreddit.subscribersCount?.toLocaleString()} members`);
for (const post of result.posts) {
  console.log(`  ${post.title} (${post.score} points)`);
}
```

#### `getSubredditsByKeywords(query, options?) -> Promise<PaginatedResult<RedditSubreddit>>`

```typescript
const subs = await client.reddit.getSubredditsByKeywords("cryptocurrency");
```

---

### TikTok — `client.tiktok`

#### `getUser(identifier, options?) -> Promise<TiktokUser>`

```typescript
const user = await client.tiktok.getUser("charlidamelio");
console.log(`${user.nickname} — ${user.followerCount?.toLocaleString()} followers`);

// By numeric ID
const user = await client.tiktok.getUser("123456789", { identifierType: "id" });
```

#### `searchUsers(name, options?) -> Promise<TiktokUser[]>`

Search users by name. Use `limit` to adjust the number of results.

```typescript
const users = await client.tiktok.searchUsers("charli");
const topFive = await client.tiktok.searchUsers("charli", { limit: 5 });
```

#### `getUsersByKeywords(query, options?) -> Promise<PaginatedResult<TiktokUser>>`

Find users who authored posts matching a keyword query. Supports `responseType` and `limit`.

```typescript
const users = await client.tiktok.getUsersByKeywords('"machine learning"', {
  responseType: ResponseType.Fast,
  limit: 20,
});
```

#### `getPostsByIds(postIds, options?) -> Promise<TiktokPost[]>`

Get 1-100 posts by their IDs.

```typescript
const posts = await client.tiktok.getPostsByIds(["7123456789012345678"]);
```

#### `getPostsByUser(identifier, options?) -> Promise<PaginatedResult<TiktokPost>>`

Get all posts by a user. Supports `responseType` and `limit`.

```typescript
const results = await client.tiktok.getPostsByUser("charlidamelio", {
  startDate: "2025-01-01",
  responseType: ResponseType.Fast,
  limit: 50,
});
```

#### `searchPosts(query, options?) -> Promise<PaginatedResult<TiktokPost>>`

Full-text search with filters. Supports `responseType` and `limit`.

```typescript
const results = await client.tiktok.searchPosts("travel vlog", {
  startDate: "2025-01-01",
  responseType: ResponseType.Fast,
  limit: 30,
});
```

#### `getPostsByHashtags(hashtags, options?) -> Promise<PaginatedResult<TiktokPost>>`

Search posts by hashtags via the indexed `hashtags` column. Pass bare alphanumeric tags (no leading `#`). Max 5 hashtags per request; OR semantics across the list.

```typescript
const results = await client.tiktok.getPostsByHashtags(["dance", "fyp"], {
  responseType: ResponseType.Fast,
  limit: 50,
});
```

#### `getUsersByHashtags(hashtags, options?) -> Promise<PaginatedResult<TiktokUser>>`

Find users who authored posts tagged with the given hashtags. Same input rules as `getPostsByHashtags`.

```typescript
const users = await client.tiktok.getUsersByHashtags(["sustainable_fashion"], {
  responseType: ResponseType.Fast,
  limit: 20,
});
```

#### `searchSounds(keyword, options?) -> Promise<TiktokSound[]>`

Search sound/music objects by keyword (title or artist). Pass the returned `id` to `getPostsBySound`.

```typescript
const sounds = await client.tiktok.searchSounds("dance monkey");
const soundId = sounds[0].id;
```

#### `getPostsBySound(soundId, options?) -> Promise<PaginatedResult<TiktokPost>>`

Find posts that use a specific sound via the indexed `music_id` column. Pass a single numeric `soundId` from `searchSounds`.

```typescript
const results = await client.tiktok.getPostsBySound("7016548364456789012", {
  responseType: ResponseType.Fast,
  limit: 50,
});
```

#### `getComments(postId, options?) -> Promise<PaginatedResult<TiktokComment>>`

```typescript
const comments = await client.tiktok.getComments("7123456789012345678");
```

---

### Tracking — `client.tracking`

Manage tracked items (keywords, users, subreddits) that Xpoz monitors on your behalf. Import the enums to build items:

```typescript
import { XpozClient, TrackedItemType, TrackedItemPlatform } from "@xpoz/xpoz";
```

#### `getTrackedItems() -> Promise<TrackedItem[]>`

List all currently tracked items on your account.

```typescript
const items = await client.tracking.getTrackedItems();
for (const item of items) {
  console.log(`${item.platform} / ${item.type}: ${item.phrase}`);
}
```

#### `addTrackedItems(items) -> Promise<AddTrackedItemsResult>`

Add one or more items to track.

```typescript
const result = await client.tracking.addTrackedItems([
  { phrase: "bitcoin", type: TrackedItemType.Keyword, platform: TrackedItemPlatform.Twitter },
  { phrase: "nasa", type: TrackedItemType.User, platform: TrackedItemPlatform.Instagram },
]);
console.log(`Added ${result.addedCount} items (${result.currentCount}/${result.maxTrackedItems} used)`);
```

#### `removeTrackedItems(items) -> Promise<RemoveTrackedItemsResult>`

Remove one or more tracked items.

```typescript
const result = await client.tracking.removeTrackedItems([
  { phrase: "bitcoin", type: TrackedItemType.Keyword, platform: TrackedItemPlatform.Twitter },
]);
console.log(`Removed ${result.removedCount} items`);
```

---

### Account — `client.account`

Read-only account, plan, and usage information for the authenticated user.

#### `getAccountDetails() -> Promise<AccountDetails>`

Returns the plan (name + feature limits), billing (period + next renewal; `billing` is `null` on the Free plan), and current usage (remaining subscription/extra credits, extra tracked items).

```typescript
const details = await client.account.getAccountDetails();
console.log(details.plan.name, details.usage.subscriptionCreditsRemaining);
```

#### `getCreditsUsageHistory(range?, granularity?) -> Promise<CreditsUsageHistory>`

Returns time-series usage for credits and export rows. `range` is one of `"today"`, `"7d"`, `"current_month"` (default), `"lifetime"`; `granularity` is `"hour"` or `"day"` (default). For current remaining balances, use `getAccountDetails()`.

```typescript
const history = await client.account.getCreditsUsageHistory("7d", "day");
for (const bucket of history.credits) {
  console.log(bucket.bucket, bucket.totalUsed);
}
```

---

## Type Models

All fields are optional and typed as their respective TypeScript types. Unknown fields are preserved on the object.

> **Date fields.** Post models expose up to three creation-time fields whose
> runtime formats differ from what their names suggest:
>
> - `createdAt` — full ISO 8601 datetime on Twitter; epoch **seconds** on
>   Reddit/Instagram/TikTok.
> - `createdAtTimestamp` — full ISO 8601 datetime (Reddit/Instagram/TikTok;
>   not returned for Twitter).
> - `createdAtDate` — the creation **date only**, rendered as ISO midnight
>   (`2026-07-20T00:00:00.000Z`); it carries no real time-of-day.
>
> Depending on response quoting, values can arrive as strings or numbers —
> treat all three as `string | number`.

### TwitterPost

| Field               | Type       | Description                |
| ------------------- | ---------- | -------------------------- |
| `id`                | `string`   | Post ID                    |
| `text`              | `string`   | Post text content          |
| `authorId`          | `string`   | Author's user ID           |
| `authorUsername`    | `string`   | Author's username          |
| `likeCount`         | `number`   | Number of likes            |
| `retweetCount`      | `number`   | Number of retweets         |
| `replyCount`        | `number`   | Number of replies          |
| `quoteCount`        | `number`   | Number of quotes           |
| `impressionCount`   | `number`   | Number of impressions      |
| `bookmarkCount`     | `number`   | Number of bookmarks        |
| `lang`              | `string`   | Language code              |
| `hashtags`          | `string[]` | Hashtags in tweet          |
| `mentions`          | `string[]` | Mentioned usernames        |
| `mediaUrls`         | `string[]` | Media attachment URLs      |
| `urls`              | `string[]` | URLs in tweet text         |
| `placeName`         | `string`   | Tagged place name          |
| `placeCountry`      | `string`   | Tagged place country       |
| `placeCountryCode`  | `string`   | Tagged place country code (ISO 3166-1 alpha-2) |
| `placeBoundingBoxCoordinates` | `unknown` | Tagged place bounding box  |
| `placeCentroid`     | `unknown`  | Tagged place centroid      |
| `createdAt`         | `string \| number` | Creation datetime (ISO 8601) |
| `createdAtDate`     | `string \| number` | Creation date (ISO midnight, no time-of-day) |
| `conversationId`    | `string`   | Thread conversation ID     |
| `quotedTweetId`     | `string`   | ID of quoted tweet         |
| `replyToTweetId`    | `string`   | ID of parent tweet         |
| `possiblySensitive` | `boolean`  | Sensitive content flag     |
| `isRetweet`         | `boolean`  | Whether this is a retweet  |
| `hasBirdwatchNotes` | `boolean`  | Has community notes        |
| `birdwatchNotesId`  | `string`   | Birdwatch note ID          |
| `birdwatchNotesText`| `string`   | Birdwatch note text        |
| `birdwatchNotesUrl` | `string`   | Birdwatch note URL         |
| `status`            | `string`   | Tweet status               |

### TwitterUser

| Field                        | Type      | Description                |
| ---------------------------- | --------- | -------------------------- |
| `id`                         | `string`  | User ID                    |
| `username`                   | `string`  | Username (handle)          |
| `name`                       | `string`  | Display name               |
| `description`                | `string`  | Bio text                   |
| `location`                   | `string`  | Location string            |
| `verified`                   | `boolean` | Verification status        |
| `verifiedType`               | `string`  | Verification type          |
| `followersCount`             | `number`  | Number of followers        |
| `followingCount`             | `number`  | Number of following        |
| `tweetCount`                 | `number`  | Total tweets               |
| `likesCount`                 | `number`  | Total likes                |
| `profileImageUrl`            | `string`  | Profile picture URL        |
| `createdAt`                  | `string`  | Account creation timestamp |
| `accountBasedIn`             | `string`  | Account location           |

### InstagramPost

| Field            | Type     | Description                |
| ---------------- | -------- | -------------------------- |
| `id`             | `string` | Post ID (strong_id format) |
| `caption`        | `string` | Post caption               |
| `username`       | `string` | Author username            |
| `fullName`       | `string` | Author display name        |
| `likeCount`      | `number` | Number of likes            |
| `commentCount`   | `number` | Number of comments         |
| `reshareCount`   | `number` | Number of reshares         |
| `videoPlayCount` | `number` | Video play count           |
| `mediaType`      | `string` | Media type                 |
| `imageUrl`       | `string` | Image URL                  |
| `videoUrl`                          | `string`  | Video URL                         |
| `createdAt`                         | `string \| number` | Creation time (epoch seconds)     |
| `createdAtTimestamp`                | `string \| number` | Creation datetime (ISO 8601)      |
| `createdAtDate`                     | `string \| number` | Creation date (ISO midnight, no time-of-day) |
| `genAiChatWithAiCtaInfo`            | `string`  | Gen AI chat CTA info              |
| `hasHighRiskGenAiInformTreatment`   | `boolean` | High risk Gen AI treatment flag   |

### InstagramUser

| Field            | Type      | Description         |
| ---------------- | --------- | ------------------- |
| `id`             | `string`  | User ID             |
| `username`       | `string`  | Username            |
| `fullName`       | `string`  | Display name        |
| `biography`      | `string`  | Bio text            |
| `isPrivate`      | `boolean` | Private account     |
| `isVerified`     | `boolean` | Verified status     |
| `followerCount`  | `number`  | Followers           |
| `followingCount` | `number`  | Following           |
| `mediaCount`     | `number`  | Total posts         |
| `profilePicUrl`  | `string`  | Profile picture URL |

### InstagramComment

| Field               | Type     | Description     |
| ------------------- | -------- | --------------- |
| `id`                | `string` | Comment ID      |
| `text`              | `string` | Comment text    |
| `username`          | `string` | Author username |
| `parentPostId`      | `string` | Parent post ID  |
| `likeCount`         | `number` | Number of likes |
| `childCommentCount` | `number` | Reply count     |
| `createdAtDate`     | `string` | Creation date   |

### RedditPost

| Field            | Type      | Description           |
| ---------------- | --------- | --------------------- |
| `id`             | `string`  | Post ID               |
| `title`          | `string`  | Post title            |
| `selftext`       | `string`  | Post body text        |
| `authorUsername` | `string`  | Author username       |
| `subredditName`  | `string`  | Subreddit name        |
| `score`          | `number`  | Net score             |
| `upvotes`        | `number`  | Upvote count          |
| `commentsCount`  | `number`  | Comment count         |
| `url`            | `string`  | Post URL              |
| `permalink`      | `string`  | Reddit permalink      |
| `isSelf`         | `boolean` | Self post (text only) |
| `over18`         | `boolean` | NSFW flag             |
| `createdAt`      | `string \| number` | Creation time (epoch seconds) |
| `createdAtTimestamp` | `string \| number` | Creation datetime (ISO 8601) |
| `createdAtDate`  | `string \| number` | Creation date (ISO midnight, no time-of-day) |

### RedditUser

| Field                | Type      | Description           |
| -------------------- | --------- | --------------------- |
| `id`                 | `string`  | User ID               |
| `username`           | `string`  | Username              |
| `totalKarma`         | `number`  | Total karma           |
| `linkKarma`          | `number`  | Link karma            |
| `commentKarma`       | `number`  | Comment karma         |
| `isGold`             | `boolean` | Reddit Gold status    |
| `isMod`              | `boolean` | Moderator status      |
| `profileDescription` | `string`  | Profile bio           |
| `createdAtDate`      | `string`  | Account creation date |

### RedditComment

| Field            | Type      | Description     |
| ---------------- | --------- | --------------- |
| `id`             | `string`  | Comment ID      |
| `body`           | `string`  | Comment text    |
| `authorUsername` | `string`  | Author username |
| `parentPostId`   | `string`  | Parent post ID  |
| `score`          | `number`  | Net score       |
| `depth`          | `number`  | Nesting depth   |
| `isSubmitter`    | `boolean` | Is OP           |
| `createdAtDate`  | `string`  | Creation date   |

### RedditSubreddit

| Field               | Type      | Description       |
| ------------------- | --------- | ----------------- |
| `id`                | `string`  | Subreddit ID      |
| `displayName`       | `string`  | Subreddit name    |
| `title`             | `string`  | Subreddit title   |
| `publicDescription` | `string`  | Short description |
| `description`       | `string`  | Full description  |
| `subscribersCount`  | `number`  | Subscriber count  |
| `activeUserCount`   | `number`  | Active users      |
| `over18`            | `boolean` | NSFW flag         |
| `createdAtDate`     | `string`  | Creation date     |

### TiktokPost

| Field                        | Type      | Description                  |
| ---------------------------- | --------- | ---------------------------- |
| `id`                         | `string`  | Post ID                      |
| `description`                | `string`  | Post caption/description     |
| `descriptionLanguage`        | `string`  | Language of description      |
| `userId`                     | `string`  | Author user ID               |
| `username`                   | `string`  | Author username              |
| `nickname`                   | `string`  | Author display name          |
| `likeCount`                  | `number`  | Number of likes              |
| `commentCount`               | `number`  | Number of comments           |
| `playCount`                  | `number`  | Video play count             |
| `collectCount`               | `number`  | Number of collects/saves     |
| `downloadCount`              | `number`  | Number of downloads          |
| `forwardCount`               | `number`  | Number of forwards/shares    |
| `videoThumbnail`             | `string`  | Thumbnail URL                |
| `videoUrl`                   | `string[]` | Array of video URLs         |
| `duration`                   | `number`  | Video duration in seconds    |
| `hashtags`                   | `string[]` | Hashtags in the post        |
| `postType`                   | `number`  | Post type code               |
| `isPrivate`                  | `boolean` | Private post flag            |
| `createdAt`                  | `string \| number` | Creation time (epoch seconds) |
| `createdAtTimestamp`         | `string \| number` | Creation datetime (ISO 8601)  |
| `createdAtDate`              | `string \| number` | Creation date (ISO midnight, no time-of-day) |

### TiktokUser

| Field            | Type      | Description              |
| ---------------- | --------- | ------------------------ |
| `id`             | `string`  | User ID                  |
| `username`       | `string`  | Username                 |
| `nickname`       | `string`  | Display name             |
| `signature`      | `string`  | Bio text                 |
| `secUid`         | `string`  | Secure user ID           |
| `avatar`         | `string`  | Profile picture URL      |
| `isPrivate`      | `boolean` | Private account          |
| `isVerified`     | `boolean` | Verified status          |
| `followerCount`  | `number`  | Number of followers      |
| `followingCount` | `number`  | Number of following      |
| `likeCount`      | `number`  | Total likes received     |
| `postCount`      | `number`  | Total posts              |
| `language`       | `string`  | Profile language         |
| `region`         | `string`  | Account region           |
| `createdAt`      | `string`  | Account creation date    |

### TiktokComment

| Field           | Type     | Description              |
| --------------- | -------- | ------------------------ |
| `id`            | `string` | Comment ID               |
| `postId`        | `string` | Parent post ID           |
| `userId`        | `string` | Author user ID           |
| `username`      | `string` | Author username          |
| `text`          | `string` | Comment text             |
| `likeCount`     | `number` | Number of likes          |
| `createdAt`     | `string` | Creation timestamp       |
| `createdAtDate` | `string` | Creation date (YYYY-MM-DD) |

### TiktokSound

| Field              | Type      | Description                       |
| ------------------ | --------- | --------------------------------- |
| `id`               | `string`  | Sound/music ID                    |
| `title`            | `string`  | Sound title                       |
| `author`           | `string`  | Sound artist/author               |
| `album`            | `string`  | Album name                        |
| `duration`         | `number`  | Duration in seconds               |
| `userCount`        | `number`  | Number of posts using the sound   |
| `isOriginal`       | `boolean` | Whether the sound is original     |
| `isCommerceMusic`  | `boolean` | Whether the sound is commercial   |
| `isOriginalSound`  | `boolean` | Whether it is an original sound   |

### AccountDetails

Returned by `getAccountDetails()`.

| Field     | Type                                  | Description                          |
| --------- | ------------------------------------- | ------------------------------------ |
| `plan`    | `{ name: string; features: PlanFeatures }` | Plan name and feature limits    |
| `billing` | `AccountBilling \| null`              | Billing info (`null` on Free plan)   |
| `usage`   | `AccountUsage`                        | Current usage balances               |

### PlanFeatures

| Field                    | Type                   | Description                     |
| ------------------------ | ---------------------- | ------------------------------- |
| `credits`                | `number`               | Subscription credits per period |
| `creditResetFrequency`   | `CreditResetFrequency` | `"monthly"` or `"never"`        |
| `extraCreditPrice`       | `number`               | Price per extra credit          |
| `trackedItems`           | `number`               | Tracked-item allowance          |
| `csvRowExportLimit`      | `number`               | CSV row export limit            |
| `extraCsvRowPrice`       | `number`               | Price per extra CSV row         |
| `extraTrackedItemPrice`  | `number`               | Price per extra tracked item    |
| `maxRowsPerExport`       | `number`               | Max rows per single export      |

### AccountBilling

| Field             | Type            | Description               |
| ----------------- | --------------- | ------------------------- |
| `billingPeriod`   | `BillingPeriod` | `"monthly"` or `"annual"` |
| `nextRenewalDate` | `string \| null` | Next renewal date         |

### AccountUsage

| Field                          | Type     | Description                    |
| ------------------------------ | -------- | ------------------------------ |
| `subscriptionCreditsRemaining` | `number` | Subscription credits remaining |
| `extraCreditsRemaining`        | `number` | Extra credits remaining        |
| `extraTrackedItems`            | `number` | Extra tracked items purchased  |

### CreditsUsageHistory

Returned by `getCreditsUsageHistory()`.

| Field         | Type                   | Description                         |
| ------------- | ---------------------- | ----------------------------------- |
| `range`       | `string`               | Requested range                     |
| `granularity` | `string`               | Requested granularity               |
| `generatedAt` | `string`               | Timestamp the report was generated  |
| `credits`     | `UsageHistoryBucket[]` | Credit usage buckets over time      |
| `exportRows`  | `UsageHistoryBucket[]` | Export-rows usage buckets over time |

### UsageHistoryBucket

| Field              | Type     | Description                           |
| ------------------ | -------- | ------------------------------------- |
| `bucket`           | `string` | Bucket timestamp (hour or day)        |
| `subscriptionUsed` | `number` | Subscription units used in the bucket |
| `extraUsed`        | `number` | Extra units used in the bucket        |
| `totalUsed`        | `number` | Total units used in the bucket        |
| `extraPurchased`   | `number` | Extra units purchased in the bucket   |

### TrackedItem

| Field      | Type                   | Description                                              |
| ---------- | ---------------------- | -------------------------------------------------------- |
| `phrase`   | `string`               | Keyword, username, or subreddit name to track            |
| `type`     | `TrackedItemType`      | `"keyword"`, `"user"`, or `"subreddit"`                  |
| `platform` | `TrackedItemPlatform`  | `"twitter"`, `"instagram"`, `"reddit"`, or `"tiktok"`   |

### AddTrackedItemsResult

| Field             | Type      | Description                        |
| ----------------- | --------- | ---------------------------------- |
| `success`         | `boolean` | Whether the operation succeeded    |
| `addedCount`      | `number`  | Number of items added              |
| `message`         | `string`  | Status message                     |
| `currentCount`    | `number`  | Total tracked items after addition |
| `maxTrackedItems` | `number`  | Plan limit for tracked items       |
| `planName`        | `string`  | Current plan name                  |

### RemoveTrackedItemsResult

| Field          | Type      | Description                     |
| -------------- | --------- | ------------------------------- |
| `success`      | `boolean` | Whether the operation succeeded |
| `removedCount` | `number`  | Number of items removed         |
| `message`      | `string`  | Status message                  |

### Composite Types

**`RedditPostWithComments`** — returned by `getPostWithComments()`:

- `post: RedditPost`
- `comments: RedditComment[]`
- `commentsPagination: PaginationInfo | null`
- `commentsTableName: string | null`

**`SubredditWithPosts`** — returned by `getSubredditWithPosts()`:

- `subreddit: RedditSubreddit`
- `posts: RedditPost[]`
- `postsPagination: PaginationInfo | null`
- `postsTableName: string | null`

---

## Environment Variables

| Variable          | Description                | Default                    |
| ----------------- | -------------------------- | -------------------------- |
| `XPOZ_API_KEY`    | API key for authentication | —                          |
| `XPOZ_SERVER_URL` | MCP server URL             | `https://mcp.xpoz.ai/mcp` |

## Testing

Tests hit the live Xpoz API and require a valid API key:

```bash
XPOZ_API_KEY=your-api-key npx vitest run
```

## License

MIT
