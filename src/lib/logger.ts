/**
 * KaziFlow — structured logger
 * ------------------------------------------------------------------
 * Lightweight, dependency-free structured logger. Emits a single JSON line
 * per entry (level, time, message, optional meta) so the output is trivially
 * consumable by any log shipper (pino, Datadog, CloudWatch, etc.).
 *
 * Honors `LOG_LEVEL` (debug | info | warn | error). Defaults to `info`.
 * Lower-priority entries are dropped before serialization, keeping hot paths
 * cheap in production.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

export type LogMeta = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return (raw in LEVEL_ORDER ? raw : "info") as LogLevel;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[resolveLevel()]) return;

  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger: Logger = {
  debug: (message, meta) => write("debug", message, meta),
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};

export type { LogLevel as LogLevelName };
