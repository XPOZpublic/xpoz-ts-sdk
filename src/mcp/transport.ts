import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";
import { parseResponseText } from "../transform/responseParser.js";
import { VERSION } from "../version.js";

const USER_AGENT = `xpoz-ts-sdk/${VERSION}`;

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY ?? process.env.https_proxy
    ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
}

async function createProxyFetch(proxyUrl: string): Promise<FetchLike> {
  const { ProxyAgent, fetch: undiciFetch } = await import("undici");
  const dispatcher = new ProxyAgent(proxyUrl);
  return ((input: string | URL, init?: RequestInit) =>
    undiciFetch(input as any, { ...(init as any), dispatcher })) as unknown as FetchLike;
}

export class McpTransport {
  private serverUrl: string;
  private apiKey: string;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(serverUrl: string, apiKey: string) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Authorization: `Bearer ${this.apiKey}`,
    };

    const proxyUrl = getProxyUrl();
    const customFetch = proxyUrl ? await createProxyFetch(proxyUrl) : undefined;

    this.transport = new StreamableHTTPClientTransport(new URL(this.serverUrl), {
      requestInit: { headers },
      ...(customFetch ? { fetch: customFetch } : {}),
    });

    this.client = new Client(
      { name: "xpoz-ts-sdk", version: VERSION },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // ignore errors on close
      }
      this.client = null;
      this.transport = null;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.client) {
      throw new Error("Transport not connected. Call connect() first.");
    }

    const result = await this.client.callTool({ name, arguments: args }) as {
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    };

    if (result.isError) {
      let errorText = "";
      for (const block of result.content) {
        if (block.text !== undefined) {
          errorText += block.text;
        }
      }
      throw new Error(`MCP tool error (${name}): ${errorText}`);
    }

    let combinedText = "";
    for (const block of result.content) {
      if (block.text !== undefined) {
        combinedText += block.text;
      }
    }

    return parseResponseText(combinedText) as Record<string, unknown>;
  }
}
