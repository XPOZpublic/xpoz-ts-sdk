export interface TwitterPost {
  id?: string | null;
  text?: string | null;
  authorId?: string | null;
  authorUsername?: string | null;
  conversationId?: string | null;
  lang?: string | null;
  source?: string | null;
  deleted?: boolean | null;
  suspended?: boolean | null;
  possiblySensitive?: boolean | null;
  isRetweet?: boolean | null;
  hasBirdwatchNotes?: boolean | null;
  birdwatchNotesId?: string | null;
  birdwatchNotesText?: string | null;
  birdwatchNotesUrl?: string | null;
  status?: string | null;

  likeCount?: number | null;
  retweetCount?: number | null;
  replyCount?: number | null;
  quoteCount?: number | null;
  impressionCount?: number | null;
  bookmarkCount?: number | null;

  quotedTweetId?: string | null;
  retweetedTweetId?: string | null;
  replyToTweetId?: string | null;
  replyToUserId?: string | null;
  replyToUsername?: string | null;
  originalTweetId?: string | null;
  editedTweets?: string[] | null;

  hashtags?: string[] | null;
  mentions?: string[] | null;
  mediaUrls?: string[] | null;
  urls?: string[] | null;
  grokGeneratedContent?: Record<string, unknown>[] | null;

  country?: string | null;
  region?: string | null;
  city?: string | null;

  createdAt?: string | null;
  createdAtDate?: string | null;

  [key: string]: unknown;
}

export interface TwitterUser {
  id?: string | null;
  username?: string | null;
  name?: string | null;
  description?: string | null;
  location?: string | null;
  verified?: boolean | null;
  verifiedType?: string | null;
  protected?: boolean | null;
  status?: string | null;

  followersCount?: number | null;
  followingCount?: number | null;
  tweetCount?: number | null;
  listedCount?: number | null;
  likesCount?: number | null;
  mediaCount?: number | null;

  profileImageUrl?: string | null;
  profileBannerUrl?: string | null;
  profileInterstitialType?: string | null;

  pinnedTweetId?: string | null;
  source?: string | null;
  isVerified?: boolean | null;
  accountBasedIn?: string | null;
  locationAccurate?: boolean | null;
  label?: string | null;
  labelType?: string | null;

  collectedFollowingCount?: number | null;
  collectedFollowersCount?: number | null;
  collectedFollowersCoverage?: number | null;
  collectedFollowingCoverage?: number | null;
  avgTweetsPerDayLastMonth?: number | null;

  nLang?: number | null;
  nLangsFiltered?: number | null;
  inauthenticType?: string | null;
  isInauthentic?: boolean | null;
  isInauthenticProbScore?: number | null;
  isInauthenticCalculatedAt?: string | null;

  verifiedSinceDatetime?: string | null;
  usernameChanges?: string[] | null;
  lastUsernameChangeDatetime?: string | null;

  createdAt?: string | null;
  xFetchedAt?: string | null;
  modifiedAt?: string | null;
  xModifiedAt?: string | null;

  aggRelevance?: number | null;
  relevantTweetsCount?: number | null;
  relevantTweetsImpressionsSum?: number | null;
  relevantTweetsLikesSum?: number | null;
  relevantTweetsQuotesSum?: number | null;
  relevantTweetsRepliesSum?: number | null;
  relevantTweetsRetweetsSum?: number | null;

  [key: string]: unknown;
}
