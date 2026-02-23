import { waitForResult } from "../mcp/polling.js";
import { PaginatedResult } from "../pagination.js";
import type { PaginationInfo } from "../types/common.js";
import { DEFAULT_TIMEOUT_MS } from "../config/constants.js";

type CallTool = (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
type RawDict = Record<string, unknown>;

function extractPagination(raw: RawDict): PaginationInfo {
  const pag = (raw["pagination"] as RawDict) ?? {};
  return {
    tableName: (pag["tableName"] as string | null) ?? null,
    totalRows: (pag["totalRows"] as number) ?? 0,
    totalPages: (pag["totalPages"] as number) ?? 0,
    pageNumber: (pag["pageNumber"] as number) ?? 1,
    pageSize: (pag["pageSize"] as number) ?? 100,
    resultsCount: (pag["resultsCount"] as number) ?? 0,
  };
}

function extractResults(raw: RawDict): RawDict[] {
  return (raw["results"] as RawDict[]) ?? [];
}

function extractExportOpId(raw: RawDict): string | null {
  return (raw["dataDumpExportOperationId"] as string) ?? null;
}

export class BaseNamespace {
  protected callTool: CallTool;
  protected timeoutMs: number;

  constructor(callTool: CallTool, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.callTool = callTool;
    this.timeoutMs = timeoutMs;
  }

  protected async callAndMaybePoll(toolName: string, args: RawDict): Promise<RawDict> {
    const result = await this.callTool(toolName, args);
    const operationId = result["operationId"] as string | undefined;
    if (operationId) {
      return waitForResult(this.callTool, operationId, this.timeoutMs);
    }
    return result;
  }

  protected buildPaginatedResult<T>(
    raw: RawDict,
    parseItem: (item: RawDict) => T,
    toolName: string,
    baseArgs: RawDict
  ): PaginatedResult<T> {
    const items = extractResults(raw).map(parseItem);
    const pagination = extractPagination(raw);
    const tableName = pagination.tableName;
    const exportOpId = extractExportOpId(raw);

    const fetchPage = async (pageNumber: number, tbl: string | null | undefined): Promise<PaginatedResult<T>> => {
      const args: RawDict = { ...baseArgs, pageNumber };
      if (tbl) args["tableName"] = tbl;
      const pageRaw = await this.callAndMaybePoll(toolName, args);
      return this.buildPaginatedResult(pageRaw, parseItem, toolName, baseArgs);
    };

    const fetchExport = async (opId: string): Promise<string> => {
      const pollResult = await waitForResult(this.callTool, opId, this.timeoutMs);
      return (pollResult["downloadUrl"] as string) ?? "";
    };

    return new PaginatedResult({
      data: items,
      pagination,
      tableName,
      exportOperationId: exportOpId,
      fetchPage,
      fetchExport,
    });
  }

  protected buildArgs(args: Record<string, unknown>): RawDict {
    const result: RawDict = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return result;
  }

  protected extractPagination(raw: RawDict): PaginationInfo {
    return extractPagination(raw);
  }

  protected extractResults(raw: RawDict): RawDict[] {
    return extractResults(raw);
  }
}
