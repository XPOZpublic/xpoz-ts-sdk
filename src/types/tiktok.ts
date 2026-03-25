export interface TiktokPost {
  id?: string | null;
  postType?: number | null;
  isPrivate?: boolean | null;
  videoThumbnail?: string | null;
  description?: string | null;
  descriptionLanguage?: string | null;
  userId?: string | null;
  username?: string | null;
  nickname?: string | null;
  collectCount?: number | null;
  commentCount?: number | null;
  likeCount?: number | null;
  downloadCount?: number | null;
  forwardCount?: number | null;
  playCount?: number | null;
  createdAt?: string | null;
  createdAtTimestamp?: number | null;
  createdAtDate?: string | null;
  lastFetch?: string | null;
  lastFetchDatetime?: string | null;
  xLastUpdated?: string | null;
  aggRelevance?: number | null;
  relevantPostsCount?: number | null;
  relevantPostsLikesSum?: number | null;
  relevantPostsCommentsSum?: number | null;
  relevantPostsPlaysSum?: number | null;
  relevantPostsForwardsSum?: number | null;
  [key: string]: unknown;
}

export interface TiktokUser {
  id?: string | null;
  username?: string | null;
  nickname?: string | null;
  signature?: string | null;
  secUid?: string | null;
  avatar?: string | null;
  isPrivate?: boolean | null;
  isVerified?: boolean | null;
  followerCount?: number | null;
  followingCount?: number | null;
  likeCount?: number | null;
  postCount?: number | null;
  language?: string | null;
  region?: string | null;
  createdAt?: string | null;
  usernameModifyTime?: string | null;
  lastFetch?: string | null;
  lastFetchDatetime?: string | null;
  xLastUpdated?: string | null;
  aggRelevance?: number | null;
  relevantPostsCount?: number | null;
  relevantPostsLikesSum?: number | null;
  relevantPostsCommentsSum?: number | null;
  relevantPostsPlaysSum?: number | null;
  relevantPostsForwardsSum?: number | null;
  [key: string]: unknown;
}

export interface TiktokComment {
  id?: string | null;
  postId?: string | null;
  userId?: string | null;
  username?: string | null;
  text?: string | null;
  likeCount?: number | null;
  createdAt?: string | null;
  createdAtTimestamp?: number | null;
  createdAtDate?: string | null;
  lastFetch?: string | null;
  lastFetchDatetime?: string | null;
  xLastUpdated?: string | null;
  [key: string]: unknown;
}
