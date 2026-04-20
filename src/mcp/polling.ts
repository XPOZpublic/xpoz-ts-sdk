import { DEFAULT_TIMEOUT_MS, POLL_INTERVAL_MS } from "../config/constants.js";
import {
  OperationFailedError,
  OperationCancelledError,
  OperationTimeoutError,
} from "../errors.js";

type CallTool = (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

export const RESPONSE_STATUS = {
  SUCCESS: "success",
  ERROR: "error",
  NO_DATA: "no_data",
  RUNNING: "running",
  CANCELLED: "cancelled",
} as const;

export function interpretStatus(
  raw: Record<string, unknown>,
  operationId?: string
): Record<string, unknown> | null {
  const status = raw["status"];

  if (status === RESPONSE_STATUS.ERROR) {
    throw new OperationFailedError({
      error: String(raw["error"] ?? "Unknown error"),
      operationId,
      message: typeof raw["message"] === "string" ? raw["message"] : undefined,
      category:
        typeof raw["category"] === "string" ? raw["category"] : undefined,
    });
  }

  if (status === RESPONSE_STATUS.CANCELLED) {
    throw new OperationCancelledError(operationId);
  }

  if (
    status === RESPONSE_STATUS.SUCCESS ||
    status === RESPONSE_STATUS.NO_DATA ||
    "results" in raw ||
    "downloadUrl" in raw
  ) {
    return raw;
  }

  return null;
}

export async function waitForResult(
  callTool: CallTool,
  operationId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Record<string, unknown>> {
  const start = Date.now();

  while (true) {
    const result = await callTool("checkOperationStatus", { operationId });

    const terminal = interpretStatus(result, operationId);
    if (terminal !== null) {
      return terminal;
    }

    const elapsed = Date.now() - start;
    if (elapsed >= timeoutMs) {
      throw new OperationTimeoutError(operationId, elapsed);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
