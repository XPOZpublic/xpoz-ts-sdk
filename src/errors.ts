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

export class OperationFailedError extends XpozError {
  operationId: string;
  operationError: string;

  constructor(operationId: string, error: string) {
    super(`Operation ${operationId} failed: ${error}`);
    this.name = "OperationFailedError";
    this.operationId = operationId;
    this.operationError = error;
  }
}

export class OperationCancelledError extends XpozError {
  operationId: string;

  constructor(operationId: string) {
    super(`Operation ${operationId} was cancelled`);
    this.name = "OperationCancelledError";
    this.operationId = operationId;
  }
}
