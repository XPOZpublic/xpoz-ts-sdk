import { describe, it, expect, vi } from "vitest";
import {
  interpretStatus,
  waitForResult,
  RESPONSE_STATUS,
} from "../src/mcp/polling.js";
import {
  OperationCancelledError,
  OperationFailedError,
  OperationTimeoutError,
} from "../src/errors.js";
import { BaseNamespace } from "../src/namespaces/base.js";
import { PaginatedResult } from "../src/pagination.js";
import { NoDataResult } from "../src/results.js";

type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

function stubCallTool(responses: Record<string, unknown>[]): {
  callTool: CallTool;
  calls: { name: string; args: Record<string, unknown> }[];
} {
  const queue = [...responses];
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const callTool: CallTool = async (name, args) => {
    calls.push({ name, args });
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("stubCallTool: no more responses");
    }
    return next;
  };
  return { callTool, calls };
}

describe("interpretStatus", () => {
  it("raises OperationFailedError with all attrs on status=error", () => {
    const raw = {
      status: RESPONSE_STATUS.ERROR,
      error: "Operation not found",
      message: "No operation found with ID: op_xxx",
      category: "internal",
    };
    try {
      interpretStatus(raw, "op_xxx");
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(OperationFailedError);
      const failed = err as OperationFailedError;
      expect(failed.operationId).toBe("op_xxx");
      expect(failed.operationError).toBe("Operation not found");
      expect(failed.errorMessage).toBe("No operation found with ID: op_xxx");
      expect(failed.category).toBe("internal");
    }
  });

  it("raises OperationFailedError without operationId on sync error", () => {
    const raw = {
      status: RESPONSE_STATUS.ERROR,
      error: "Empty query",
      category: "validation",
    };
    try {
      interpretStatus(raw);
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(OperationFailedError);
      const failed = err as OperationFailedError;
      expect(failed.operationId).toBeUndefined();
      expect(failed.category).toBe("validation");
      expect(failed.message).toContain("Operation failed: Empty query");
    }
  });

  it("raises OperationCancelledError on status=cancelled", () => {
    expect(() =>
      interpretStatus({ status: RESPONSE_STATUS.CANCELLED }, "op_xxx")
    ).toThrow(OperationCancelledError);
  });

  it("returns raw dict on status=success", () => {
    const raw = { status: RESPONSE_STATUS.SUCCESS, results: [{ id: 1 }] };
    expect(interpretStatus(raw)).toBe(raw);
  });

  it("returns raw dict on status=no_data", () => {
    const raw = { status: RESPONSE_STATUS.NO_DATA, message: "no matches" };
    expect(interpretStatus(raw)).toBe(raw);
  });

  it("returns raw dict when results key present without status", () => {
    const raw = { results: [] as unknown[] };
    expect(interpretStatus(raw)).toBe(raw);
  });

  it("returns raw dict when downloadUrl key present", () => {
    const raw = { downloadUrl: "https://example.com/f.csv" };
    expect(interpretStatus(raw)).toBe(raw);
  });

  it("returns null on status=running", () => {
    expect(
      interpretStatus({ status: RESPONSE_STATUS.RUNNING, progress: 0.5 })
    ).toBeNull();
  });

  it("returns null on unknown status", () => {
    expect(interpretStatus({ status: "pending" })).toBeNull();
  });
});

describe("waitForResult", () => {
  it("throws OperationFailedError on first error response", async () => {
    const { callTool, calls } = stubCallTool([
      {
        status: "error",
        error: "Tool execution failed",
        message: "crawler timeout",
        category: "internal",
      },
    ]);
    await expect(waitForResult(callTool, "op_xxx", 10_000)).rejects.toThrow(
      OperationFailedError
    );
    expect(calls).toHaveLength(1);
  });

  it("polls until success", async () => {
    vi.useFakeTimers();
    const { callTool, calls } = stubCallTool([
      { status: "running" },
      { status: "running" },
      { status: "success", results: [{ id: 1 }] },
    ]);
    const promise = waitForResult(callTool, "op_xxx", 60_000);
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await promise;
    expect(result["results"]).toEqual([{ id: 1 }]);
    expect(calls).toHaveLength(3);
    vi.useRealTimers();
  });

  it("returns raw dict on no_data", async () => {
    const { callTool } = stubCallTool([
      { status: "no_data", message: "no matches" },
    ]);
    const result = await waitForResult(callTool, "op_xxx", 10_000);
    expect(result["status"]).toBe("no_data");
    expect(result["message"]).toBe("no matches");
  });

  it("throws OperationCancelledError on cancelled", async () => {
    const { callTool } = stubCallTool([{ status: "cancelled" }]);
    await expect(waitForResult(callTool, "op_xxx", 10_000)).rejects.toThrow(
      OperationCancelledError
    );
  });

  it("throws OperationTimeoutError when elapsed exceeds timeout", async () => {
    vi.useFakeTimers();
    const { callTool } = stubCallTool([
      { status: "running" },
      { status: "running" },
    ]);
    const caught = waitForResult(callTool, "op_xxx", 1_000).catch(
      (e: unknown) => e
    );
    await vi.advanceTimersByTimeAsync(10_000);
    const err = await caught;
    expect(err).toBeInstanceOf(OperationTimeoutError);
    vi.useRealTimers();
  });
});

class TestNamespace extends BaseNamespace {
  async invoke(toolName: string, args: Record<string, unknown>) {
    return this.callAndMaybePoll(toolName, args);
  }

  build(
    raw: Record<string, unknown>,
    toolName: string,
    baseArgs: Record<string, unknown>
  ) {
    return this.buildPaginatedResult(
      raw,
      (item) => item,
      toolName,
      baseArgs
    );
  }
}

describe("callAndMaybePoll (sync response path)", () => {
  it("raises OperationFailedError on sync error without operationId", async () => {
    const { callTool, calls } = stubCallTool([
      {
        status: "error",
        error: "Empty query",
        message: "Query cannot be empty",
        category: "validation",
      },
    ]);
    const ns = new TestNamespace(callTool, 10_000);
    await expect(
      ns.invoke("getRedditPostsByKeywords", { query: "" })
    ).rejects.toMatchObject({
      name: "OperationFailedError",
      operationError: "Empty query",
      category: "validation",
    });
    expect(calls).toHaveLength(1);
  });

  it("returns sync success result", async () => {
    const { callTool } = stubCallTool([
      { status: "success", results: [{ id: 1 }] },
    ]);
    const ns = new TestNamespace(callTool, 10_000);
    const result = await ns.invoke("someTool", {});
    expect(result["results"]).toEqual([{ id: 1 }]);
  });

  it("returns sync no_data result", async () => {
    const { callTool } = stubCallTool([
      { status: "no_data", message: "empty" },
    ]);
    const ns = new TestNamespace(callTool, 10_000);
    const result = await ns.invoke("someTool", {});
    expect(result["status"]).toBe("no_data");
    expect(result["message"]).toBe("empty");
  });

  it("polls async operation and returns eventual result", async () => {
    vi.useFakeTimers();
    const { callTool, calls } = stubCallTool([
      { operationId: "op_xxx", status: "running" },
      { status: "running" },
      { status: "success", results: [{ id: 42 }] },
    ]);
    const ns = new TestNamespace(callTool, 60_000);
    const promise = ns.invoke("someTool", {});
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await promise;
    expect(result["results"]).toEqual([{ id: 42 }]);
    expect(calls).toHaveLength(3);
    vi.useRealTimers();
  });
});

describe("buildPaginatedResult (NoDataResult)", () => {
  it("returns NoDataResult when status is no_data", () => {
    const { callTool } = stubCallTool([]);
    const ns = new TestNamespace(callTool, 10_000);
    const raw = { status: "no_data", message: "no matches for query" };
    const result = ns.build(raw, "searchRedditPosts", {});
    expect(result).toBeInstanceOf(NoDataResult);
    if (result instanceof NoDataResult) {
      expect(result.status).toBe("no_data");
      expect(result.message).toBe("no matches for query");
    }
  });

  it("returns PaginatedResult when status is success", () => {
    const { callTool } = stubCallTool([]);
    const ns = new TestNamespace(callTool, 10_000);
    const raw = {
      status: "success",
      results: [{ id: 1 }],
      pagination: {
        tableName: "t_xxx",
        totalRows: 1,
        totalPages: 1,
        pageNumber: 1,
        pageSize: 100,
        resultsCount: 1,
      },
    };
    const result = ns.build(raw, "searchRedditPosts", {});
    expect(result).toBeInstanceOf(PaginatedResult);
  });
});
