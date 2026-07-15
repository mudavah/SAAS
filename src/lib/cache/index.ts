/**
 * KaziFlow — cache abstraction (Redis & Cache Optimization)
 * ------------------------------------------------------------------
 * A single, dependency-free cache interface used to optimize hot read paths,
 * API responses, and rate-limit / session state.
 *
 * Two backing stores are supported out of the box:
 *   1. In-memory LRU (default, zero-dependency) — always available.
 *   2. Redis (optional) — loaded lazily when REDIS_URL is set. Redis is NOT a
 *      hard dependency: the import is performed at runtime and degrades
 *      silently to the in-memory store when the package or connection is
 *      missing. This keeps `npm install` / `next build` green without Redis.
 *
 * Usage (read-through cache helper):
 *   const value = await cache.getOrSet("org:limits:" + id, () => compute(id), 60);
 */
import { logger } from "@/lib/logger";

export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  /** Best-effort bulk clear (used in tests / maintenance). */
  clear?(): Promise<void>;
  /** True when this is the durable (Redis) store. */
  readonly distributed: boolean;
}

// ── In-memory LRU store (bounded, process-local) ───────────────────────────────
interface MemEntry {
  value: unknown;
  expiresAt: number; // epoch ms; Infinity => no expiry
}

class MemoryStore implements CacheStore {
  readonly distributed = false;
  private map = new Map<string, MemEntry>();
  private max: number;

  constructor(max = 2000) {
    this.max = max;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [k, v] of this.map) {
      if (v.expiresAt <= now) this.map.delete(k);
    }
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // LRU: re-insert to move to most-recently-used.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.map.size >= this.max) this.sweep();
    if (this.map.size >= this.max) {
      // Evict oldest entry (Map preserves insertion order).
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds * 1000 : Infinity;
    this.map.set(key, { value, expiresAt: Date.now() + ttl });
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}

// ── Optional Redis store (lazy import; never breaks the build) ──────────────────
class RedisStore implements CacheStore {
  readonly distributed = true;
  private clientPromise: Promise<{ get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: { ex?: number }) => Promise<unknown>; del: (k: string) => Promise<unknown> }> | null = null;

  private load(): Promise<any> {
    if (this.clientPromise) return this.clientPromise;
    const specifier = "ioredis";
    this.clientPromise = import(/* webpackIgnore: true */ specifier)
      .then((mod: any) => {
        const Redis = mod.default ?? mod.Redis;
        const client = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 2,
          lazyConnect: true,
          enableOfflineQueue: false,
        });
        client.on("error", (err: Error) =>
          logger.warn("Redis client error", { error: err.message })
        );
        return client;
      })
      .catch((err) => {
        logger.warn("Redis unavailable; falling back to memory cache", {
          error: String(err),
        });
        this.clientPromise = null;
        throw err;
      });
    return this.clientPromise;
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    try {
      const client = await this.load();
      const raw = await client.get(key);
      if (raw == null) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const client = await this.load();
      const raw = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) await client.set(key, raw, { ex: ttlSeconds });
      else await client.set(key, raw);
    } catch (err) {
      logger.debug("Redis set failed; ignored", { error: String(err) });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await this.load();
      await client.del(key);
    } catch {
      /* ignore */
    }
  }
}

const memoryStore = new MemoryStore(
  Number(process.env.CACHE_MAX_ENTRIES ?? 2000)
);

export const redisAvailable = (): boolean => !!process.env.REDIS_URL;

const store: CacheStore = process.env.REDIS_URL ? new RedisStore() : memoryStore;

export const cache: CacheStore = store;

/** True when the active store is shared across instances (Redis). */
export function isDistributedCache(): boolean {
  return store.distributed;
}

/**
 * Read-through cache helper. Returns the cached value when present; otherwise
 * runs `compute`, caches the result, and returns it. On any cache failure the
 * compute path is always used (fail-open).
 */
export async function getOrSet<T>(
  key: string,
  compute: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  try {
    const hit = await cache.get<T>(key);
    if (hit !== undefined) return hit;
  } catch {
    /* fall through to compute */
  }
  const value = await compute();
  try {
    await cache.set(key, value, ttlSeconds);
  } catch {
    /* ignore cache write failures */
  }
  return value;
}

/** Convenience: invalidate one or many keys (prefix match for memory store). */
export async function invalidate(keys: string | string[]): Promise<void> {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    try {
      await cache.delete(k);
    } catch {
      /* ignore */
    }
  }
}

export { MemoryStore };
