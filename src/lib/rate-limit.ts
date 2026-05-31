/**
 * Simple in-memory rate limiter.
 * Tracks request counts per IP in a sliding window.
 * Resets automatically — no external dependencies needed.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60_000);

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

const DEFAULTS: RateLimitConfig = {
  maxRequests: 30,
  windowSeconds: 60,
};

/**
 * Check if a request should be rate limited.
 * Returns { allowed: true } or { allowed: false, retryAfter }.
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: true } | { allowed: false; retryAfter: number } {
  const { maxRequests, windowSeconds } = { ...DEFAULTS, ...config };
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt <= now) {
    // First request or window expired
    store.set(identifier, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Extract a rate-limit identifier from a Request object.
 * Uses IP from headers, falls back to a constant for local dev.
 */
export function getRateLimitId(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local-dev";
  return `rl:${ip}`;
}
