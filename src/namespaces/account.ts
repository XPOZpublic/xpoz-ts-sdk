import { BaseNamespace } from "./base.js";
import type { AccountDetails, CreditsUsageHistory } from "../types/account.js";
import * as tools from "../config/tools.js";

export class AccountNamespace extends BaseNamespace {
  async getAccountDetails(): Promise<AccountDetails> {
    const result = await this.callTool(tools.GET_ACCOUNT_DETAILS, {});
    return result["data"] as AccountDetails;
  }

  async getCreditsUsageHistory(
    range?: string,
    granularity?: string
  ): Promise<CreditsUsageHistory> {
    const args = this.buildArgs({ range, granularity });
    const result = await this.callTool(tools.GET_CREDITS_USAGE_HISTORY, args);
    return result["data"] as CreditsUsageHistory;
  }
}
