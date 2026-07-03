export interface RetryOptions {
  retries: number;
  /** Base delay in ms. */
  delayMs: number;
  /** Multiply delay by this each attempt (1 = fixed interval). */
  backoff?: number;
  /** Cap on delay in ms. */
  maxDelayMs?: number;
  /** Return false to stop retrying (e.g. 401 — don't retry auth failures). */
  shouldRetry?: (err: unknown) => boolean;
  onRetry?: (attempt: number, err: unknown) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn`, retrying on throw. Used for external API calls per Execution Rule #6
 * (all external calls are rate-limited and retried with backoff). With backoff=1
 * and delayMs=30000, retries=10 this is the spec's "retry every 30s for 5 min".
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const { retries, delayMs, backoff = 2, maxDelayMs = 60_000 } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = opts.shouldRetry ? opts.shouldRetry(err) : true;
      if (!retryable || attempt === retries) break;
      opts.onRetry?.(attempt + 1, err);
      const wait = Math.min(delayMs * Math.pow(backoff, attempt), maxDelayMs);
      await sleep(wait);
    }
  }
  throw lastErr;
}
