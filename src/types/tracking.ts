export interface TrackedItem {
  phrase?: string;
  type?: "keyword" | "user" | "subreddit";
  platform?: "twitter" | "instagram" | "reddit" | "tiktok";
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
