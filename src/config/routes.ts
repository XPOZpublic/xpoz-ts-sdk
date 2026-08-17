export const DEFAULT_API_URL = "https://api.xpoz.ai";
export const ENV_API_URL = "XPOZ_API_URL";

const INSTAGRAM_BASE = "/api/data/instagram";

export const INSTAGRAM_LIVE_ROUTES = {
  posts: `${INSTAGRAM_BASE}/posts/live`,
  userPosts: (identifier: string) =>
    `${INSTAGRAM_BASE}/posts/users/${encodeURIComponent(identifier)}/live`,
  post: (postId: string) => `${INSTAGRAM_BASE}/posts/${encodeURIComponent(postId)}/live`,
  postComments: (postId: string) =>
    `${INSTAGRAM_BASE}/posts/${encodeURIComponent(postId)}/comments/live`,
  postInteractingUsers: (postId: string) =>
    `${INSTAGRAM_BASE}/posts/${encodeURIComponent(postId)}/interacting-users/live`,
  users: `${INSTAGRAM_BASE}/users/live`,
  user: (identifier: string) => `${INSTAGRAM_BASE}/users/${encodeURIComponent(identifier)}/live`,
  userConnections: (identifier: string) =>
    `${INSTAGRAM_BASE}/users/${encodeURIComponent(identifier)}/connections/live`,
} as const;

export const REST_TIMEOUT_MS = 120_000;
