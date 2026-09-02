export interface InstagramPost {
  id?: string | null;
  postType?: string | null;
  userId?: string | null;
  username?: string | null;
  fullName?: string | null;
  caption?: string | null;
  mediaType?: string | null;

  codeUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioOnlyUrl?: string | null;
  profilePicUrl?: string | null;
  videoSubtitlesUri?: string | null;

  subtitles?: string | null;
  videoDuration?: number | null;

  likeCount?: number | null;
  commentCount?: number | null;
  reshareCount?: number | null;
  mediaRepostCount?: number | null;
  saveCount?: number | null;
  videoPlayCount?: number | null;

  location?: string | null;
  genAiChatWithAiCtaInfo?: string | null;
  hasHighRiskGenAiInformTreatment?: boolean | null;

  createdAt?: string | number | null;
  createdAtTimestamp?: string | number | null;
  createdAtDate?: string | number | null;

  [key: string]: unknown;
}

export interface InstagramUser {
  id?: string | null;
  username?: string | null;
  fullName?: string | null;
  biography?: string | null;
  isPrivate?: boolean | null;
  isVerified?: boolean | null;

  followerCount?: number | null;
  followingCount?: number | null;
  mediaCount?: number | null;

  profilePicUrl?: string | null;
  profilePicId?: string | null;
  profileUrl?: string | null;
  externalUrl?: string | null;
  hasAnonymousProfilePicture?: boolean | null;

  aggRelevance?: number | null;
  relevantPostsCount?: number | null;
  relevantPostsLikesSum?: number | null;
  relevantPostsCommentsSum?: number | null;
  relevantPostsResharesSum?: number | null;
  relevantPostsMediaRepostsSum?: number | null;
  relevantPostsSavesSum?: number | null;
  relevantPostsVideoPlaysSum?: number | null;

  [key: string]: unknown;
}

export interface InstagramComment {
  id?: string | null;
  text?: string | null;
  parentPostId?: string | null;
  parentPostUserId?: string | null;
  type?: string | null;
  parentCommentId?: string | null;
  repliedToCommentId?: string | null;
  childCommentCount?: number | null;

  userId?: string | null;
  username?: string | null;
  fullName?: string | null;

  likeCount?: number | null;
  status?: string | null;
  isSpam?: boolean | null;
  hasTranslation?: boolean | null;

  createdAt?: string | number | null;
  createdAtTimestamp?: string | number | null;
  createdAtDate?: string | number | null;

  [key: string]: unknown;
}
