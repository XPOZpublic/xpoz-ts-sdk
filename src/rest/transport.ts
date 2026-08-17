import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  XpozConnectionError,
  XpozError,
} from "../errors.js";
import { REST_TIMEOUT_MS } from "../config/routes.js";
import { VERSION } from "../version.js";

const USER_AGENT = `xpoz-ts-sdk/${VERSION}`;

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const message = body.error ?? body.message;
    return typeof message === "string" ? message : response.statusText;
  } catch {
    return response.statusText;
  }
}

async function raiseForStatus(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const message = await extractErrorMessage(response);

  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError(message);
  }
  if (response.status === 404) {
    throw new NotFoundError(message);
  }
  if (response.status === 400) {
    throw new ValidationError(message);
  }
  throw new XpozError(`HTTP ${response.status}: ${message}`);
}

export class RestTransport {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(baseUrl: string, apiKey: string, timeoutMs: number = REST_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async get<T>(path: string, params: QueryParams = {}): Promise<T> {
    const url = `${this.baseUrl}${path}${buildQuery(params)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new XpozConnectionError(reason);
    } finally {
      clearTimeout(timer);
    }

    await raiseForStatus(response);
    return (await response.json()) as T;
  }
}
