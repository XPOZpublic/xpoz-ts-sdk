export class XpozError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XpozError";
  }
}

export class AuthenticationError extends XpozError {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class XpozConnectionError extends XpozError {
  constructor(message: string) {
    super(message);
    this.name = "XpozConnectionError";
  }
}

export class OperationTimeoutError extends XpozError {
  operationId: string;
  elapsedMs: number;

  constructor(operationId: string, elapsedMs: number) {
    super(`Operation ${operationId} timed out after ${Math.round(elapsedMs / 1000)}s`);
    this.name = "OperationTimeoutError";
    this.operationId = operationId;
    this.elapsedMs = elapsedMs;
  }
}

export interface OperationFailedErrorParams {
  error: string;
  operationId?: string;
  message?: string;
  category?: string;
}

export class OperationFailedError extends XpozError {
  operationId?: string;
  operationError: string;
  errorMessage?: string;
  category?: string;

  constructor(params: OperationFailedErrorParams) {
    const prefix = params.operationId
      ? `Operation ${params.operationId}`
      : "Operation";
    super(`${prefix} failed: ${params.error}`);
    this.name = "OperationFailedError";
    this.operationId = params.operationId;
    this.operationError = params.error;
    this.errorMessage = params.message;
    this.category = params.category;
  }
}

export class OperationCancelledError extends XpozError {
  operationId?: string;

  constructor(operationId?: string) {
    const target = operationId ? `Operation ${operationId}` : "Operation";
    super(`${target} was cancelled`);
    this.name = "OperationCancelledError";
    this.operationId = operationId;
  }
}
