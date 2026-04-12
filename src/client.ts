import { McpTransport } from "./mcp/transport.js";
import { AuthenticationError } from "./errors.js";
import { DEFAULT_SERVER_URL, DEFAULT_TIMEOUT_MS, ENV_API_KEY, ENV_SERVER_URL } from "./config/constants.js";
import { TwitterNamespace } from "./namespaces/twitter.js";
import { InstagramNamespace } from "./namespaces/instagram.js";
import { RedditNamespace } from "./namespaces/reddit.js";
import { TiktokNamespace } from "./namespaces/tiktok.js";
import { TrackingNamespace } from "./namespaces/tracking.js";
import { checkForUpdates } from "./versionCheck.js";

export class XpozClient {
  twitter: TwitterNamespace;
  instagram: InstagramNamespace;
  reddit: RedditNamespace;
  tiktok: TiktokNamespace;
  tracking: TrackingNamespace;

  private transport: McpTransport;
  private versionCheck: boolean;

  constructor(options: {
    apiKey?: string;
    serverUrl?: string;
    timeoutMs?: number;
    versionCheck?: boolean;
  } = {}) {
    const apiKey = options.apiKey ?? process.env[ENV_API_KEY];
    if (!apiKey) {
      throw new AuthenticationError(
        `API key required. Get your token at http://xpoz.ai/get-token?utm_source=ts_sdk&utm_medium=sdk ` +
          `(login → copy token), then pass it as apiKey or set the ${ENV_API_KEY} environment variable.`
      );
    }

    this.versionCheck = options.versionCheck ?? true;

    const serverUrl =
      options.serverUrl ?? process.env[ENV_SERVER_URL] ?? DEFAULT_SERVER_URL;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    this.transport = new McpTransport(serverUrl, apiKey);

    const callTool = this.transport.callTool.bind(this.transport);
    this.twitter = new TwitterNamespace(callTool, timeoutMs);
    this.instagram = new InstagramNamespace(callTool, timeoutMs);
    this.reddit = new RedditNamespace(callTool, timeoutMs);
    this.tiktok = new TiktokNamespace(callTool, timeoutMs);
    this.tracking = new TrackingNamespace(callTool, timeoutMs);
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    if (this.versionCheck) {
      checkForUpdates();
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
