const DEFAULT_CONCURRENCY = 10;

export async function parallelMap<TInput, TResult>(
  items: TInput[],
  fn: (item: TInput) => Promise<TResult>,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
