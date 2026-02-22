import { McpTransport } from "./transport.js";
import { AuthenticationError } from "./errors.js";
import { DEFAULT_SERVER_URL, DEFAULT_TIMEOUT_MS, ENV_API_KEY, ENV_SERVER_URL } from "./constants.js";
import { TwitterNamespace } from "./namespaces/twitter.js";
import { InstagramNamespace } from "./namespaces/instagram.js";
import { RedditNamespace } from "./namespaces/reddit.js";

export class XpozClient {
  twitter: TwitterNamespace;
  instagram: InstagramNamespace;
  reddit: RedditNamespace;

  private transport: McpTransport;

  constructor(options: {
    apiKey?: string;
    serverUrl?: string;
    timeoutMs?: number;
  } = {}) {
    const apiKey = options.apiKey ?? process.env[ENV_API_KEY];
    if (!apiKey) {
      throw new AuthenticationError(
        `API key required. Get your token at http://xpoz.ai/get-token?utm_source=ts_sdk&utm_medium=sdk ` +
          `(login → copy token), then pass it as apiKey or set the ${ENV_API_KEY} environment variable.`
      );
    }

    const serverUrl =
      options.serverUrl ?? process.env[ENV_SERVER_URL] ?? DEFAULT_SERVER_URL;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    this.transport = new McpTransport(serverUrl, apiKey);

    const callTool = this.transport.callTool.bind(this.transport);
    this.twitter = new TwitterNamespace(callTool, timeoutMs);
    this.instagram = new InstagramNamespace(callTool, timeoutMs);
    this.reddit = new RedditNamespace(callTool, timeoutMs);
  }

  async connect(): Promise<void> {
    await this.transport.connect();
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
