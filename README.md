# Xpoz TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@xpoz/xpoz)](https://www.npmjs.com/package/@xpoz/xpoz)

TypeScript SDK for the [Xpoz](https://xpoz.ai) social media intelligence platform. Query Twitter/X, Instagram, and Reddit data through a simple, typed interface.

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

Xpoz provides unified access to social media data across Twitter/X, Instagram, and Reddit. The platform indexes billions of posts, user profiles, and engagement metrics — making it possible to search, analyze, and export social media data at scale.

The SDK wraps Xpoz's [MCP](https://modelcontextprotocol.io) server, abstracting away transport, authentication, operation polling, and pagination into a clean developer-friendly API.

## Features

- **30 data methods** across Twitter, Instagram, and Reddit
- **Fully async** — all methods return `Promise<T>`
- **Automatic operation polling** — long-running queries are abstracted away
- **Response types** — choose between fast (immediate), paging (full pagination), or CSV export
- **Server-side pagination** — `PaginatedResult<T>` with `nextPage()`, `getPage(n)`
- **CSV export** — `exportCsv()` on any paginated result
- **Field selection** — request only the fields you need
- **TypeScript-first** — fully typed results with autocomplete support
- **Namespaced API** — `client.twitter.*`, `client.instagram.*`, `client.reddit.*`

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
| **Fast** | `ResponseType.Fast` | Returns up to 300 results immediately, no async polling | Quick queries, UI previews |
| **Paging** | `ResponseType.Paging` | Async paginated query with full dataset access (default) | Full analysis, large datasets |
| **CSV** | `ResponseType.Csv` | Async bulk export, use `exportCsv()` to get download URL | Data exports |

### Fast mode

Returns results immediately without polling. Use `limit` to constrain the number of results (max 300):

```typescript
const results = await client.twitter.searchPosts("bitcoin", {
  startDate: "2025-01-01",
  responseType: ResponseType.Fast,
  limit: 50,
});
console.log(results.data.length); // up to 50 results, returned immediately
```

### Paging mode (default)

The default behavior. Returns paginated results with full `totalRows`, `totalPages`, and `tableName` for cursor-based navigation:

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

These methods accept `limit` only:

- `twitter.searchUsers()`, `instagram.searchUsers()`, `reddit.searchUsers()`, `reddit.searchSubreddits()`

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

## Type Models

All fields are optional and typed as their respective TypeScript types. Unknown fields are preserved on the object.

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
| `urls`              | `string[]` | URLs in tweet              |
| `country`           | `string`   | Country (if geo-tagged)    |
| `createdAt`         | `string`   | Creation timestamp         |
| `createdAtDate`     | `string`   | Creation date (YYYY-MM-DD) |
| `conversationId`    | `string`   | Thread conversation ID     |
| `quotedTweetId`     | `string`   | ID of quoted tweet         |
| `replyToTweetId`    | `string`   | ID of parent tweet         |
| `isRetweet`         | `boolean`  | Whether this is a retweet  |
| `possiblySensitive` | `boolean`  | Sensitive content flag     |

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
| `isInauthentic`              | `boolean` | Inauthenticity flag        |
| `isInauthenticProbScore`     | `number`  | Inauthenticity probability |
| `avgTweetsPerDayLastMonth`   | `number`  | Tweeting frequency         |

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
| `videoUrl`       | `string` | Video URL                  |
| `createdAtDate`  | `string` | Creation date              |

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
| `createdAtDate`  | `string`  | Creation date         |

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
