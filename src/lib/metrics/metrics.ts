/**
 * KaziFlow — in-memory metrics collector
 * ------------------------------------------------------------------
 * Production-safe, dependency-free collector for observability signals.
 * Storage is process-local and reset on a fixed interval so memory stays
 * bounded. It is intentionally NOT a long-term store — pair it with the
 * structured logger / a real metrics backend for durable dashboards.
 *
 * Tracks: request count, error count, API latency, DB query time, active
 * users. The singleton is pinned to `globalThis` so it survives Next.js
 * hot-reloads and serverless warm starts within a single process.
 */
import { logger } from "@/lib/logger";

export interface MetricsSnapshot {
  /** Process uptime in seconds (since the collector first loaded). */
  uptimeSeconds: number;
  /** Seconds elapsed in the current sampling window. */
  windowSeconds: number;
  requestCount: number;
  errorCount: number;
  /** errors / requests, as a ratio in [0, 1]. */
  errorRate: number;
  avgApiLatencyMs: number;
  p95ApiLatencyMs: number;
  avgDbQueryTimeMs: number;
  activeUsers: number;
  generatedAt: string;
}

interface Counter {
  count: number;
  sumMs: number;
  maxMs: number;
  /** Bounded reservoir of recent samples for percentile estimation. */
  samples: number[];
}

const MAX_SAMPLES = 200;
const RESET_INTERVAL_MS = 60_000;
const ACTIVE_USER_WINDOW_MS = 5 * 60_000;
const MAX_ACTIVE_USERS = 50_000;

interface MetricsState {
  startedAt: number;
  windowStartedAt: number;
  requestCount: number;
  errorCount: number;
  apiLatency: Counter;
  dbQueryTime: Counter;
  /** userId -> last-seen epoch ms. */
  activeUsers: Map<string, number>;
  resetTimer: ReturnType<typeof setInterval> | null;
}

function newCounter(): Counter {
  return { count: 0, sumMs: 0, maxMs: 0, samples: [] };
}

function createState(): MetricsState {
  return {
    startedAt: Date.now(),
    windowStartedAt: Date.now(),
    requestCount: 0,
    errorCount: 0,
    apiLatency: newCounter(),
    dbQueryTime: newCounter(),
    activeUsers: new Map(),
    resetTimer: null,
  };
}

const globalForMetrics = globalThis as unknown as {
  __kfMetrics?: MetricsState;
};

const state: MetricsState = globalForMetrics.__kfMetrics ?? createState();

if (!globalForMetrics.__kfMetrics) {
  globalForMetrics.__kfMetrics = state;
  state.resetTimer = setInterval(resetWindow, RESET_INTERVAL_MS);
  // Metrics maintenance must never keep the event loop alive on its own
  // (important for serverless / test environments).
  const timer = state.resetTimer as { unref?: () => void } | null;
  if (timer && typeof timer.unref === "function") timer.unref();
}

function recordLatency(c: Counter, ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  c.count += 1;
  c.sumMs += ms;
  if (ms > c.maxMs) c.maxMs = ms;
  c.samples.push(ms);
  if (c.samples.length > MAX_SAMPLES) c.samples.shift();
}

function average(c: Counter): number {
  return c.count > 0 ? Math.round((c.sumMs / c.count) * 100) / 100 : 0;
}

function percentile(c: Counter, p: number): number {
  if (c.samples.length === 0) return 0;
  const sorted = [...c.samples].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[idx];
}

/** Reset per-window counters. Auto-invoked on `RESET_INTERVAL_MS`. */
export function resetWindow(): void {
  const prev = getSnapshot();
  state.requestCount = 0;
  state.errorCount = 0;
  state.apiLatency = newCounter();
  state.dbQueryTime = newCounter();
  state.windowStartedAt = Date.now();

  // Drop users who have not been seen within the active window.
  const cutoff = Date.now() - ACTIVE_USER_WINDOW_MS;
  for (const [id, ts] of state.activeUsers) {
    if (ts < cutoff) state.activeUsers.delete(id);
  }

  logger.info("metrics window reset", { snapshot: prev });
}

// ── recorders ────────────────────────────────────────────────────────────────

export function recordApiLatency(ms: number): void {
  recordLatency(state.apiLatency, ms);
}

export function recordDbQueryTime(ms: number): void {
  recordLatency(state.dbQueryTime, ms);
}

export function recordRequest(): void {
  state.requestCount += 1;
}

export function recordError(): void {
  state.errorCount += 1;
}

/** Mark a user as active "now". Bounded; oldest entries evicted when full. */
export function markUserActive(userId: string): void {
  if (!userId) return;
  const now = Date.now();
  if (
    !state.activeUsers.has(userId) &&
    state.activeUsers.size >= MAX_ACTIVE_USERS
  ) {
    const oldest = state.activeUsers.keys().next().value;
    if (oldest !== undefined) state.activeUsers.delete(oldest);
  }
  state.activeUsers.set(userId, now);
}

export function getSnapshot(): MetricsSnapshot {
  const requests = state.requestCount;
  const errors = state.errorCount;
  return {
    uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
    windowSeconds: Math.round((Date.now() - state.windowStartedAt) / 1000),
    requestCount: requests,
    errorCount: errors,
    errorRate: requests > 0 ? errors / requests : 0,
    avgApiLatencyMs: average(state.apiLatency),
    p95ApiLatencyMs: percentile(state.apiLatency, 95),
    avgDbQueryTimeMs: average(state.dbQueryTime),
    activeUsers: state.activeUsers.size,
    generatedAt: new Date().toISOString(),
  };
}
