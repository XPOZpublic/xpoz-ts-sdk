export const DEFAULT_SERVER_URL = "https://mcp.xpoz.ai/mcp";
export const DEFAULT_API_URL = "https://api.xpoz.ai";
export const ENV_API_KEY = "XPOZ_API_KEY";
export const ENV_SERVER_URL = "XPOZ_SERVER_URL";

export enum ResponseType {
  Fast = "fast",
  Paging = "paging",
  Csv = "csv",
}

export const POLL_INTERVAL_MS = 5_000;
export const DEFAULT_TIMEOUT_MS = 300_000;
