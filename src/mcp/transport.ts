import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { RateLimitError } from "../errors.js";
import { parseResponseText } from "../transform/responseParser.js";
import { VERSION } from "../version.js";

const USER_AGENT = `xpoz-ts-sdk/${VERSION}`;

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

    this.transport = new StreamableHTTPClientTransport(new URL(this.serverUrl), {
      requestInit: { headers },
    });

    this.client = new Client(
      { name: "xpoz-ts-sdk", version: VERSION },
      { capabilities: {} }
    );

    try {
      await this.client.connect(this.transport);
    } catch (error) {
      if (error instanceof StreamableHTTPError && error.code === 429) {
        throw new RateLimitError();
      }
      throw error;
    }
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

    let result: {
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    };
    try {
      result = await this.client.callTool({ name, arguments: args }) as typeof result;
    } catch (error) {
      if (error instanceof StreamableHTTPError && error.code === 429) {
        throw new RateLimitError();
      }
      throw error;
    }

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
