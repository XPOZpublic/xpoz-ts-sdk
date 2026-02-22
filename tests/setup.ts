import { XpozClient } from "../src/index.js";

export function createTestClient(): XpozClient | null {
  const apiKey = process.env["XPOZ_API_KEY"];
  if (!apiKey) return null;
  const serverUrl = process.env["XPOZ_SERVER_URL"] ?? undefined;
  return new XpozClient({ apiKey, serverUrl, timeoutMs: 600_000 });
}
