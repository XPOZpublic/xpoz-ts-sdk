import { BaseNamespace } from "./base.js";
import type { AccountDetails } from "../types/account.js";
import * as tools from "../config/tools.js";

export class AccountNamespace extends BaseNamespace {
  async getAccountDetails(): Promise<AccountDetails> {
    const result = await this.callTool(tools.GET_ACCOUNT_DETAILS, {});
    return result["data"] as AccountDetails;
  }
}
