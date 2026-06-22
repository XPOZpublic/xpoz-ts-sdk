export enum BillingPeriod {
  Monthly = "monthly",
  Annual = "annual",
}

export enum CreditResetFrequency {
  Monthly = "monthly",
  Never = "never",
}

export interface PlanFeatures {
  credits: number;
  creditResetFrequency: CreditResetFrequency;
  extraCreditPrice: number;
  trackedItems?: number;
  csvRowExportLimit: number;
  extraCsvRowPrice: number;
  extraTrackedItemPrice?: number;
  maxRowsPerExport?: number;
}

export interface AccountBilling {
  billingPeriod: BillingPeriod;
  nextRenewalDate: string | null;
}

export interface AccountUsage {
  subscriptionCreditsRemaining: number;
  extraCreditsRemaining: number;
  extraTrackedItems: number;
}

export interface AccountDetails {
  plan: {
    name: string;
    features: PlanFeatures;
  };
  billing: AccountBilling | null;
  usage: AccountUsage;
}

export interface UsageHistoryBucket {
  bucket: string;
  subscriptionUsed: number;
  extraUsed: number;
  totalUsed: number;
  extraPurchased: number;
}

export interface CreditsUsageHistory {
  range: string;
  granularity: string;
  generatedAt: string;
  credits: UsageHistoryBucket[];
  exportRows: UsageHistoryBucket[];
}
