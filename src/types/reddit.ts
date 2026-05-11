import type { PaginationInfo } from "./common.js";

export interface RedditPost {
  id?: string | null;
  title?: string | null;
  selftext?: string | null;
  url?: string | null;
  permalink?: string | null;
  postUrl?: string | null;
  thumbnail?: string | null;

  authorId?: string | null;
  authorUsername?: string | null;

  subredditName?: string | null;
  subredditId?: string | null;

  score?: number | null;
  upvotes?: number | null;
  downvotes?: number | null;
  upvoteRatio?: number | null;
  commentsCount?: number | null;
  crosspostsCount?: number | null;

  isSelf?: boolean | null;
  isVideo?: boolean | null;
  isOriginalContent?: boolean | null;
  over18?: boolean | null;
  spoiler?: boolean | null;
  locked?: boolean | null;
  stickied?: boolean | null;
  archived?: boolean | null;

  linkFlairText?: string | null;
  postHint?: string | null;
  domain?: string | null;
  crosspostParent?: string | null;

  createdAt?: string | null;
  createdAtTimestamp?: number | null;
  createdAtDate?: string | null;

  [key: string]: unknown;
}

export interface RedditUser {
  id?: string | null;
  username?: string | null;
  profileUrl?: string | null;
  profilePicUrl?: string | null;
  snoovatarImg?: string | null;

  linkKarma?: number | null;
  commentKarma?: number | null;
  totalKarma?: number | null;
  awardeeKarma?: number | null;
  awarderKarma?: number | null;

  isGold?: boolean | null;
  isMod?: boolean | null;
  isEmployee?: boolean | null;
  hasVerifiedEmail?: boolean | null;
  isSuspended?: boolean | null;
  verified?: boolean | null;
  isBlocked?: boolean | null;
  acceptFollowers?: boolean | null;
  hasSubscribed?: boolean | null;
  hideFromRobots?: boolean | null;
  prefShowSnoovatar?: boolean | null;

  profileDescription?: string | null;
  profileBannerUrl?: string | null;
  profileTitle?: string | null;

  createdAt?: string | null;
  createdAtTimestamp?: number | null;
  createdAtDate?: string | null;

  aggRelevance?: number | null;
  relevantPostsCount?: number | null;
  relevantPostsUpvotesSum?: number | null;
  relevantPostsCommentsCountSum?: number | null;

  [key: string]: unknown;
}

export interface RedditComment {
  id?: string | null;
  body?: string | null;
  parentPostId?: string | null;
  parentId?: string | null;

  authorId?: string | null;
  authorUsername?: string | null;

  postSubredditName?: string | null;
  postSubredditId?: string | null;

  score?: number | null;
  upvotes?: number | null;
  downvotes?: number | null;
  controversiality?: number | null;

  depth?: number | null;
  isSubmitter?: boolean | null;
  stickied?: boolean | null;
  collapsed?: boolean | null;
  edited?: boolean | null;
  distinguished?: string | null;

  createdAt?: string | null;
  createdAtTimestamp?: number | null;
  createdAtDate?: string | null;

  [key: string]: unknown;
}

export interface RedditSubreddit {
  id?: string | null;
  displayName?: string | null;
  title?: string | null;
  publicDescription?: string | null;
  description?: string | null;

  subscribersCount?: number | null;
  activeUserCount?: number | null;

  subredditType?: string | null;
  over18?: boolean | null;
  lang?: string | null;
  url?: string | null;
  subredditUrl?: string | null;

  iconImg?: string | null;
  bannerImg?: string | null;
  headerImg?: string | null;
  communityIcon?: string | null;

  createdAt?: string | null;
  createdAtTimestamp?: number | null;
  createdAtDate?: string | null;

  aggRelevance?: number | null;
  relevantPostsCount?: number | null;
  relevantPostsUpvotesSum?: number | null;
  relevantPostsCommentsCountSum?: number | null;

  [key: string]: unknown;
}

export interface RedditPostWithComments {
  post?: RedditPost | null;
  comments?: RedditComment[] | null;
  commentsPagination?: PaginationInfo | null;
  commentsTableName?: string | null;
}

export interface SubredditWithPosts {
  subreddit?: RedditSubreddit | null;
  posts?: RedditPost[] | null;
  postsPagination?: PaginationInfo | null;
  postsTableName?: string | null;
}
