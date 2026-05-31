/**
 * Retry Utility — Exponential backoff with jitter for reliable external service calls.
 *
 * Handles transient failures (network timeouts, 5xx, rate limits) by retrying
 * with exponentially increasing delays. Includes jitter to avoid thundering herd.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Backoff exponent multiplier (default: 2) */
  exponent?: number;
  /** Whether to add random jitter (default: true) */
  jitter?: boolean;
  /** Optional predicate to determine if an error is retryable (default: all errors) */
  retryable?: (error: unknown) => boolean;
  /** Optional timeout per attempt in ms (default: no timeout) */
  timeout?: number;
  /** Logger function (default: console.warn) */
  logger?: (msg: string) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponent: 2,
  jitter: true,
  retryable: () => true,
  timeout: 0,
  logger: (msg: string) => console.warn(`[Retry] ${msg}`),
};

/**
 * Determine if an error is likely transient and worth retrying.
 * Network errors, 5xx responses, and rate limits are retryable.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network/timeout errors
    if (
      error.message.includes("timeout") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("fetch failed") ||
      error.message.includes("network") ||
      error.message.includes("socket hang up")
    ) {
      return true;
    }
    // Rate limiting
    if (
      error.message.includes("429") ||
      error.message.includes("rate limit") ||
      error.message.includes("too many requests")
    ) {
      return true;
    }
    // Server errors
    if (
      error.message.includes("500") ||
      error.message.includes("502") ||
      error.message.includes("503") ||
      error.message.includes("504") ||
      error.message.includes("service unavailable") ||
      error.message.includes("server error")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter.
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = Math.min(
    options.baseDelay * Math.pow(options.exponent, attempt),
    options.maxDelay
  );
  if (options.jitter) {
    // Add ±25% jitter
    const jitterAmount = delay * 0.25;
    return Math.max(0, delay - jitterAmount + Math.random() * jitterAmount * 2);
  }
  return delay;
}

/**
 * Execute an async function with retry logic and exponential backoff.
 *
 * @example
 * const result = await withRetry(() => fetch('/api/data'), { maxRetries: 3 });
 *
 * @example
 * const result = await withRetry(
 *   () => sendEmail(message),
 *   { maxRetries: 2, retryable: isTransientError }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (opts.timeout > 0) {
        // Run with timeout
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Request timed out after ${opts.timeout}ms`)),
              opts.timeout
            )
          ),
        ]);
        return result;
      }
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = attempt < opts.maxRetries && opts.retryable(error);
      if (!shouldRetry) {
        throw error;
      }

      const delay = calculateDelay(attempt, opts);
      opts.logger(
        `Attempt ${attempt + 1}/${opts.maxRetries} failed: ${error instanceof Error ? error.message : String(error)}. Retrying in ${Math.round(delay)}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wraps a function with retry logic, returning a new function with the same signature.
 *
 * @example
 * const sendWithRetry = wrapWithRetry(sendEmail, { maxRetries: 3 });
 * await sendWithRetry(message);
 */
export function wrapWithRetry<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options?: RetryOptions
): (...args: Args) => Promise<T> {
  return (...args: Args) => withRetry(() => fn(...args), options);
}
