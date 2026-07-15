/**
 * KaziFlow — API optimization helpers
 * ------------------------------------------------------------------
 * Production-grade response optimization for read endpoints:
 *   - cacheControl(): stamp Cache-Control / Expires headers on read responses.
 *   - withReadCache(): short-circuit repeat reads via the request-scoped /
 *     shared cache, returning a 304 when the client sent a matching ETag.
 *   - conditionalResponse(): ETag + If-None-Match handling.
 *
 * All helpers fail open: a cache miss or error never changes the business
 * result, only the latency / header.
 */
import { NextResponse } from "next/server";
import type { NextResponse as NextResponseType } from "next/server";
import { cache, getOrSet, type CacheStore } from "@/lib/cache";

export interface CacheOptions {
  ttlSeconds?: number;
  /** Stale-while-revalidate window advertised to clients. */
  swrSeconds?: number;
  /** When false, skip Cache-Control headers (internal-only response). */
  public?: boolean;
}

/**
 * Return a headers object for a cacheable GET response. Honors stale-while-
 * revalidate for resilience under load.
 */
export function cacheControlHeaders(
  ttlSeconds = 30,
  swrSeconds = 60,
  isPublic = true
): Record<string, string> {
  const directives = [
    isPublic ? "public" : "private",
    `max-age=${ttlSeconds}`,
    `stale-while-revalidate=${swrSeconds}`,
  ];
  return {
    "Cache-Control": directives.join(", "),
    Vary: "Authorization, Accept-Encoding",
  };
}

/** Stamp cache headers onto an existing NextResponse. */
export function withCacheControl(
  res: NextResponseType,
  opts: CacheOptions = {}
): NextResponseType {
  const { ttlSeconds = 30, swrSeconds = 60, public: isPublic = true } = opts;
  for (const [k, v] of Object.entries(
    cacheControlHeaders(ttlSeconds, swrSeconds, isPublic)
  )) {
    res.headers.set(k, v);
  }
  return res;
}

function etagFor(payload: string): string {
  // FNV-1a 32-bit hash, hex — cheap, dependency-free, collides are harmless
  // because a 304 is only returned when the client's etag matches exactly.
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `"${(h >>> 0).toString(16)}"`;
}

/**
 * Wrap a read handler so that identical requests within `ttl` are served from
 * cache, and clients that supply a matching `If-None-Match` get a 304.
 *
 *   export const GET = withReadCache(async (req) => { ... }, { ttlSeconds: 15 });
 */
export function withReadCache(
  handler: (req: Request) => Promise<NextResponseType>,
  opts: CacheOptions & { key?: (req: Request) => string } = {}
): (req: Request) => Promise<NextResponseType> {
  const ttl = opts.ttlSeconds ?? 30;
  const swr = opts.swrSeconds ?? 60;

  return async (req: Request) => {
    const baseKey =
      opts.key?.(req) ??
      `api:${req.method}:${safePath(req)}:${req.headers.get("authorization") ?? ""}`;
    const cacheKey = `read:${hashKey(baseKey)}`;

    // 1) Honor client-side conditional GET first (cheapest path).
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch) {
      try {
        const cached = await cache.get<{ etag: string; body: string }>(cacheKey);
        if (cached && cached.etag === ifNoneMatch) {
          return new NextResponse(null, {
            status: 304,
            headers: withCacheControlHeaders({}, { ttl, swr }),
          });
        }
      } catch {
        /* fall through */
      }
    }

    // 2) Serve from cache when present.
    try {
      const cached = await cache.get<{ etag: string; body: string }>(cacheKey);
      if (cached) {
        const res = new NextResponse(cached.body, {
          status: 200,
          headers: { "Content-Type": "application/json", ETag: cached.etag },
        });
        return withCacheControl(res, { ttlSeconds: ttl, swrSeconds: swr });
      }
    } catch {
      /* fall through to handler */
    }

    // 3) Compute, cache, return.
    const res = await handler(req);
    if (res.status === 200) {
      const body = await res.clone().text();
      const etag = etagFor(body);
      try {
        await cache.set(cacheKey, { etag, body }, ttl);
      } catch {
        /* ignore write failure */
      }
      const out = new NextResponse(body, {
        status: 200,
        headers: { "Content-Type": "application/json", ETag: etag },
      });
      return withCacheControl(out, { ttlSeconds: ttl, swrSeconds: swr });
    }
    return res;
  };
}

function withCacheControlHeaders(
  base: Record<string, string>,
  opts: { ttl: number; swr: number }
): Record<string, string> {
  return { ...base, ...cacheControlHeaders(opts.ttl, opts.swr) };
}

function safePath(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return req.url;
  }
}

function hashKey(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export { getOrSet, type CacheStore };
