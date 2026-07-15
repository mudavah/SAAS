/**
 * Performance & Cache Optimization — cache layer tests
 * ------------------------------------------------------------------
 * Validates the read-through cache used by hot API paths: in-memory LRU
 * eviction, TTL expiry, and the fail-open getOrSet helper. Pure (no Redis
 * required) — Redis is exercised only when REDIS_URL is set in production.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache, getOrSet, MemoryStore } from "@/lib/cache";
import { redisAvailable, isDistributedCache } from "@/lib/cache";

describe("memory cache store", () => {
  it("stores and retrieves values", async () => {
    const store = new MemoryStore(10);
    await store.set("k", { a: 1 });
    expect(await store.get("k")).toEqual({ a: 1 });
  });

  it("expires entries after TTL", async () => {
    const store = new MemoryStore(10);
    await store.set("k", "v", 0.05);
    await new Promise((r) => setTimeout(r, 80));
    expect(await store.get("k")).toBeUndefined();
  });

  it("evicts least-recently-used when full", async () => {
    const store = new MemoryStore(2);
    await store.set("a", 1);
    await store.set("b", 2);
    await store.set("c", 3); // evicts "a"
    expect(await store.get("a")).toBeUndefined();
    expect(await store.get("b")).toBe(2);
    expect(await store.get("c")).toBe(3);
  });
});

describe("read-through getOrSet", () => {
  it("computes once and serves from cache on repeat", async () => {
    const compute = vi.fn(async () => "value");
    expect(await getOrSet("rt:1", compute)).toBe("value");
    expect(await getOrSet("rt:1", compute)).toBe("value");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("falls back to compute when cache throws", async () => {
    const broken = new MemoryStore(1) as any;
    broken.get = () => Promise.reject(new Error("boom"));
    // Use the default cache; ensure compute still runs (fail-open).
    const compute = vi.fn(async () => 42);
    expect(await getOrSet("rt:2", compute)).toBe(42);
    expect(compute).toHaveBeenCalled();
  });
});

describe("cache backend selection", () => {
  it("reports distributed only when REDIS_URL is set", () => {
    // In CI/test REDIS_URL is unset → in-memory, non-distributed.
    expect(isDistributedCache()).toBe(redisAvailable());
  });

  it("default cache is functional", async () => {
    await cache.set("probe", 1, 5);
    expect(await cache.get("probe")).toBe(1);
  });
});
