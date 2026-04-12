import { BaseNamespace } from "./base.js";
import type {
  TrackedItem,
  AddTrackedItemsResult,
  RemoveTrackedItemsResult,
} from "../types/tracking.js";
import * as tools from "../config/tools.js";

export class TrackingNamespace extends BaseNamespace {
  async getTrackedItems(): Promise<TrackedItem[]> {
    const result = await this.callTool(tools.GET_TRACKED_ITEMS, {});
    return (result["data"] as TrackedItem[]) ?? [];
  }

  async addTrackedItems(
    items: TrackedItem[]
  ): Promise<AddTrackedItemsResult> {
    const args = this.buildArgs({ items });
    const result = await this.callTool(tools.ADD_TRACKED_ITEMS, args);
    return result as unknown as AddTrackedItemsResult;
  }

  async removeTrackedItems(
    items: TrackedItem[]
  ): Promise<RemoveTrackedItemsResult> {
    const args = this.buildArgs({ items });
    const result = await this.callTool(tools.REMOVE_TRACKED_ITEMS, args);
    return result as unknown as RemoveTrackedItemsResult;
  }
}
