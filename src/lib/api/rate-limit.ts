/**
 * KaziFlow Public API — rate limiting
 * ------------------------------------------------------------------
 * Lightweight fixed-window limiter. In-memory per process (sufficient for a
 * single node / dev); swap for Redis in a horizontally-scaled deployment.
 * Limits are per organization for the public API and per API key for usage.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs?: number;
}

const DEFAULT_WINDOW_MS = 60_000;

export async function rateLimit(
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const existing = windows.get(opts.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    windows.set(opts.key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: opts.limit,
      remaining: opts.limit - 1,
      resetAt,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= opts.limit;
  return {
    allowed,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Default public API limits per organization (requests / minute). */
export const API_RATE_LIMIT = 600;

/** Hard limit per individual API key (requests / minute). */
export const API_KEY_RATE_LIMIT = 120;

/** Prune expired windows periodically to bound memory. */
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}, 60_000).unref?.();
