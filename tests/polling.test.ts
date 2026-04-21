import { describe, expect, it } from "vitest";

import {
  OperationCancelledError,
  OperationFailedError,
} from "../src/errors.js";
import { waitForResult } from "../src/mcp/polling.js";
import { BaseNamespace } from "../src/namespaces/base.js";

type RawDict = Record<string, unknown>;
type CallTool = (name: string, args: RawDict) => Promise<RawDict>;

function mockCallTool(responses: RawDict[]): CallTool {
  let i = 0;
  return async () => {
    if (i >= responses.length) {
      throw new Error("mockCallTool: no more responses queued");
    }
    return responses[i++];
  };
}

class TestNamespace extends BaseNamespace {
  async run(toolName: string, args: RawDict): Promise<RawDict> {
    return this.callAndMaybePoll(toolName, args);
  }
}

describe("waitForResult", () => {
  it("throws OperationFailedError on status: error", async () => {
    const mock = mockCallTool([
      { status: "error", error: "Operation not found", category: "internal" },
    ]);
    await expect(waitForResult(mock, "op_abc", 10_000)).rejects.toMatchObject({
      name: "OperationFailedError",
      operationId: "op_abc",
      operationError: "Operation not found",
    });
  });

  it("returns on status: success", async () => {
    const response = {
      status: "success",
      results: [{ id: "1" }],
      pagination: {},
    };
    const mock = mockCallTool([response]);
    await expect(waitForResult(mock, "op_abc", 10_000)).resolves.toEqual(
      response
    );
  });

  it("throws OperationCancelledError on status: cancelled", async () => {
    const mock = mockCallTool([{ status: "cancelled" }]);
    await expect(waitForResult(mock, "op_abc", 10_000)).rejects.toBeInstanceOf(
      OperationCancelledError
    );
  });
});

describe("callAndMaybePoll", () => {
  it("throws OperationFailedError on sync status: error", async () => {
    const mock = mockCallTool([
      { status: "error", error: "Empty query", category: "validation" },
    ]);
    const ns = new TestNamespace(mock, 10_000);
    await expect(ns.run("getRedditPostsByKeywords", {})).rejects.toMatchObject({
      name: "OperationFailedError",
      operationId: "",
      operationError: "Empty query",
    });
  });

  it("polls when operationId present and returns success", async () => {
    const mock = mockCallTool([
      { operationId: "op_x" },
      { status: "success", results: [{ id: "1" }] },
    ]);
    const ns = new TestNamespace(mock, 10_000);
    const result = await ns.run("getTwitterPostsByKeywords", {});
    expect(result["results"]).toEqual([{ id: "1" }]);
  });

  it("returns sync success with results unchanged", async () => {
    const mock = mockCallTool([{ results: [{ id: "1" }] }]);
    const ns = new TestNamespace(mock, 10_000);
    const result = await ns.run("searchTwitterUsers", {});
    expect(result["results"]).toEqual([{ id: "1" }]);
  });

  it("thrown OperationFailedError is catchable as Error", async () => {
    const mock = mockCallTool([{ status: "error", error: "Crawler failed" }]);
    const ns = new TestNamespace(mock, 10_000);
    try {
      await ns.run("getTwitterPostsByAuthor", {});
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OperationFailedError);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
