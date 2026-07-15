/**
 * KaziFlow — Redis-backed rate-limit store (Redis & Cache Optimization)
 * ------------------------------------------------------------------
 * Implements the `RateLimitStore` interface from ./rate-limit.ts against Redis
 * so API limits are *shared across all server instances* and survive deploys.
 *
 * `ioredis` is loaded lazily (inside the store methods) so it is NOT a hard
 * build dependency. When Redis is unreachable the store degrades to an
 * allow-by-default behavior, preventing a Redis outage from taking the API
 * down (fail-open). Enable by setting REDIS_URL.
 */
import type { RateLimitStore } from "./rate-limit";

interface RlWindow {
  count: number;
  resetAt: number;
}

let clientPromise: Promise<any> | null = null;
let failed = false;

function loadClient(): Promise<any> | null {
  if (failed) return null;
  if (clientPromise) return clientPromise;
  // Variable specifier → TS does not resolve types (ioredis is optional).
  const specifier = "ioredis";
  clientPromise = import(/* webpackIgnore: true */ specifier)
    .then((mod: any) => {
      const Redis = mod.default ?? mod.Redis;
      const client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      client.on("error", () => {
        /* swallow: methods handle null client */
      });
      return client;
    })
    .catch(() => {
      failed = true;
      clientPromise = null;
      return null;
    });
  return clientPromise;
}

export function createRedisRateLimitStore(): RateLimitStore {
  return {
    async get(key: string): Promise<RlWindow | undefined> {
      const client = await loadClient();
      if (!client) return undefined;
      try {
        const raw = await client.get(`rl:${key}`);
        return raw ? (JSON.parse(raw) as RlWindow) : undefined;
      } catch {
        return undefined;
      }
    },
    async set(key: string, value: RlWindow): Promise<void> {
      const client = await loadClient();
      if (!client) return;
      try {
        const ttlSeconds = Math.max(1, Math.ceil((value.resetAt - Date.now()) / 1000));
        await client.set(`rl:${key}`, JSON.stringify(value), "EX", ttlSeconds);
      } catch {
        /* fail-open */
      }
    },
    async delete(key: string): Promise<void> {
      const client = await loadClient();
      if (!client) return;
      try {
        await client.del(`rl:${key}`);
      } catch {
        /* ignore */
      }
    },
  };
}
