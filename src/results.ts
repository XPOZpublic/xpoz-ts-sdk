export class NoDataResult {
  readonly status = "no_data" as const;
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}
