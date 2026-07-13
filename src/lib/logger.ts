/**
 * KaziFlow — structured logging
 * ------------------------------------------------------------------
 * A single, runtime-agnostic logger used by API routes and critical lib
 * functions. In production it emits one JSON object per line (easy to ship to
 * any log aggregator); in development it prints a color-free, readable line.
 *
 * Every log record carries at least `timestamp` and `level`. Callers should
 * pass request-scoped context (requestId, userId, organizationId, path,
 * method, duration) via `withContext` so it is attached to every line.
 *
 * Works in Node and Edge runtimes (uses console.* + Web crypto UUID only).
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

export interface LogContext {
  requestId?: string;
  userId?: string | null;
  organizationId?: string | null;
  path?: string;
  method?: string;
  durationMs?: number;
  [key: string]: unknown;
}

interface LoggerOptions {
  level?: LogLevel;
  json?: boolean;
  sink?: (line: string) => void;
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx".replace(/x/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }
}

export class Logger {
  private base: LogContext;
  private minLevel: LogLevel;
  private json: boolean;
  private sink: (line: string) => void;

  constructor(base: LogContext = {}, opts: LoggerOptions = {}) {
    this.base = base;
    this.minLevel = opts.level ?? (isProd() ? "info" : "debug");
    this.json = opts.json ?? isProd();
    this.sink = opts.sink ?? ((line) => console.log(line));
  }

  withContext(ctx: LogContext): Logger {
    return new Logger({ ...this.base, ...ctx }, {
      level: this.minLevel,
      json: this.json,
      sink: this.sink,
    });
  }

  child(ctx: LogContext): Logger {
    return this.withContext(ctx);
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const record: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.base,
      ...meta,
    };

    if (this.json) {
      this.sink(JSON.stringify(record));
      return;
    }

    const ts = record.timestamp as string;
    const scope =
      this.base.requestId || this.base.organizationId || this.base.userId
        ? ` [${[
            this.base.requestId,
            this.base.organizationId,
            this.base.userId,
          ]
            .filter(Boolean)
            .join("|")}]`
        : "";
    const extra = Object.keys(meta ?? {}).length
      ? " " + JSON.stringify(meta)
      : "";
    this.sink(`${ts} ${level.toUpperCase()}${scope} ${message}${extra}`);
  }

  trace(message: string, meta?: Record<string, unknown>) {
    this.emit("trace", message, meta);
  }
  debug(message: string, meta?: Record<string, unknown>) {
    this.emit("debug", message, meta);
  }
  info(message: string, meta?: Record<string, unknown>) {
    this.emit("info", message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>) {
    this.emit("warn", message, meta);
  }
  error(message: string, meta?: Record<string, unknown>) {
    this.emit("error", message, meta);
  }
}

export const logger = new Logger();

export function newRequestId(): string {
  return uuid();
}

export async function withLogging<T>(
  ctx: { path?: string; method?: string; requestId?: string },
  fn: (log: Logger) => Promise<T>
): Promise<T> {
  const log = logger.withContext({
    requestId: ctx.requestId,
    path: ctx.path,
    method: ctx.method,
  });
  const start = Date.now();
  try {
    return await fn(log);
  } catch (err) {
    log.error("unhandled error", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}
