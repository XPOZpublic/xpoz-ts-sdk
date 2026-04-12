export enum TrackedItemType {
  Keyword = "keyword",
  User = "user",
  Subreddit = "subreddit",
}

export enum TrackedItemPlatform {
  Twitter = "twitter",
  Instagram = "instagram",
  Reddit = "reddit",
  TikTok = "tiktok",
}

export interface TrackedItem {
  phrase?: string;
  type?: TrackedItemType;
  platform?: TrackedItemPlatform;
}

export interface AddTrackedItemsResult {
  success?: boolean;
  addedCount?: number;
  message?: string;
  currentCount?: number;
  maxTrackedItems?: number;
  planName?: string;
}

export interface RemoveTrackedItemsResult {
  success?: boolean;
  removedCount?: number;
  message?: string;
}
