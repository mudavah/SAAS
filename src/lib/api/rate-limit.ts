/**
 * KaziFlow Public API — rate limiting
 * ------------------------------------------------------------------
 * Lightweight fixed-window limiter. The limiter is backed by a pluggable
 * store (see `RateLimitStore`). The default in-memory store is sufficient
 * for a single node / dev, but it resets on every deploy and is not shared
 * across serverless instances. To scale horizontally, implement `RateLimitStore`
 * with Redis / Upstash and assign it to `rateLimitStore` below.
 */

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Storage adapter for rate-limit windows. Implement this against Redis /
 * Upstash to share limits across serverless instances and survive deploys.
 */
export interface RateLimitStore {
  get(key: string): Promise<Window | undefined>;
  set(key: string, value: Window): Promise<void>;
  delete(key: string): Promise<void>;
}

/** In-memory store. DEFAULT — keeps existing behavior unchanged. */
const memoryStore: RateLimitStore = (() => {
  const windows = new Map<string, Window>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of windows) {
      if (w.resetAt <= now) windows.delete(key);
    }
  }, 60_000).unref?.();
  return {
    get: (key) => Promise.resolve(windows.get(key)),
    set: (key, value) => {
      windows.set(key, value);
      return Promise.resolve();
    },
    delete: (key) => {
      windows.delete(key);
      return Promise.resolve();
    },
  };
})();

// To wire Redis/Upstash, implement `RateLimitStore` above and assign it here,
// e.g. `export const rateLimitStore: RateLimitStore = new RedisRateLimitStore();`
export const rateLimitStore: RateLimitStore = memoryStore;

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
  const existing = await rateLimitStore.get(opts.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    await rateLimitStore.set(opts.key, { count: 1, resetAt });
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

/** Strict limit for unauthenticated auth endpoints (requests / 10 minutes). */
export const AUTH_RATE_LIMIT = 10;
export const AUTH_RATE_WINDOW_MS = 10 * 60_000;

/** Best-effort client IP for rate-limit keys. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
