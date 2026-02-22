import { DEFAULT_TIMEOUT_MS, POLL_INTERVAL_MS } from "./constants.js";
import {
  OperationFailedError,
  OperationCancelledError,
  OperationTimeoutError,
} from "./errors.js";

type CallTool = (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

export async function waitForResult(
  callTool: CallTool,
  operationId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Record<string, unknown>> {
  const start = Date.now();

  while (true) {
    const result = await callTool("checkOperationStatus", { operationId });
    const status = result["status"];

    if (status === "failed") {
      const error = result["error"] ?? "Unknown error";
      throw new OperationFailedError(operationId, String(error));
    }

    if (status === "cancelled") {
      throw new OperationCancelledError(operationId);
    }

    if (status === "completed" || "results" in result || "downloadUrl" in result) {
      return result;
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
