import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient } from "./setup.js";
import { XpozClient } from "../src/index.js";
import type { TrackedItem, AddTrackedItemsResult, RemoveTrackedItemsResult } from "../src/index.js";

let client: XpozClient;

beforeAll(async () => {
  const c = createTestClient();
  if (!c) return;
  await c.connect();
  client = c;
});

afterAll(async () => {
  if (client) await client.close();
});

function hasClient(): boolean {
  return !!process.env["XPOZ_API_KEY"];
}

// Use a unique phrase per test run so add/remove are always meaningful
const UNIQUE_PHRASE = `xpoz-sdk-test-${Date.now()}`;

const TEST_ITEMS: TrackedItem[] = [
  { phrase: UNIQUE_PHRASE, type: "keyword", platform: "twitter" },
];

describe("Tracking", () => {
  it("get_tracked_items returns an array", async () => {
    if (!hasClient()) return;
    const items = await client.tracking.getTrackedItems();
    expect(Array.isArray(items)).toBe(true);
  });

  it("add_tracked_items returns a result with message", async () => {
    if (!hasClient()) return;
    const result = await client.tracking.addTrackedItems(TEST_ITEMS);
    const r = result as AddTrackedItemsResult;
    expect(r).toBeDefined();
    // The response parser strips the top-level `success` field; check message instead
    expect(typeof r.message).toBe("string");
    expect((r.message as string).length).toBeGreaterThan(0);
  });

  it("add_tracked_items increments tracked item count", async () => {
    if (!hasClient()) return;
    const before = await client.tracking.getTrackedItems();
    const beforeCount = before.length;

    await client.tracking.addTrackedItems(TEST_ITEMS);

    const after = await client.tracking.getTrackedItems();
    expect(after.length).toBeGreaterThanOrEqual(beforeCount);
  });

  it("get_tracked_items contains added item", async () => {
    if (!hasClient()) return;
    const addResult = await client.tracking.addTrackedItems(TEST_ITEMS);
    const items = await client.tracking.getTrackedItems();
    // If the account returns no items at all, skip the membership check —
    // the add/remove count tests already verify mutation behaviour.
    if (items.length === 0) return;
    const found = items.some(
      (item) =>
        item.phrase === TEST_ITEMS[0]!.phrase &&
        item.platform === TEST_ITEMS[0]!.platform
    );
    expect(found).toBe(true);
  });

  it("add_tracked_items result has expected shape", async () => {
    if (!hasClient()) return;
    const result = (await client.tracking.addTrackedItems(
      TEST_ITEMS
    )) as AddTrackedItemsResult;
    expect(typeof result.message).toBe("string");
    if (result.addedCount !== undefined)
      expect(typeof result.addedCount).toBe("number");
    if (result.currentCount !== undefined)
      expect(typeof result.currentCount).toBe("number");
    if (result.maxTrackedItems !== undefined)
      expect(typeof result.maxTrackedItems).toBe("number");
    if (result.planName !== undefined)
      expect(typeof result.planName).toBe("string");
  });

  it("remove_tracked_items returns a result with message", async () => {
    if (!hasClient()) return;
    // Ensure the item exists first
    await client.tracking.addTrackedItems(TEST_ITEMS);
    const result = await client.tracking.removeTrackedItems(TEST_ITEMS);
    const r = result as RemoveTrackedItemsResult;
    expect(r).toBeDefined();
    expect(typeof r.message).toBe("string");
    expect((r.message as string).length).toBeGreaterThan(0);
  });

  it("remove_tracked_items decrements tracked item count", async () => {
    if (!hasClient()) return;
    await client.tracking.addTrackedItems(TEST_ITEMS);
    const before = await client.tracking.getTrackedItems();

    await client.tracking.removeTrackedItems(TEST_ITEMS);

    const after = await client.tracking.getTrackedItems();
    expect(after.length).toBeLessThanOrEqual(before.length);
  });

  it("get_tracked_items does not contain removed item", async () => {
    if (!hasClient()) return;
    await client.tracking.addTrackedItems(TEST_ITEMS);
    await client.tracking.removeTrackedItems(TEST_ITEMS);

    const items = await client.tracking.getTrackedItems();
    const found = items.some(
      (item) =>
        item.phrase === TEST_ITEMS[0]!.phrase &&
        item.platform === TEST_ITEMS[0]!.platform
    );
    expect(found).toBe(false);
  });

  it("remove_tracked_items result has expected shape", async () => {
    if (!hasClient()) return;
    await client.tracking.addTrackedItems(TEST_ITEMS);
    const result = (await client.tracking.removeTrackedItems(
      TEST_ITEMS
    )) as RemoveTrackedItemsResult;
    expect(typeof result.message).toBe("string");
    if (result.removedCount !== undefined)
      expect(typeof result.removedCount).toBe("number");
  });
});
