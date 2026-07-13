/**
 * KaziFlow — error monitoring
 * ------------------------------------------------------------------
 * Centralized error capture. Every error is first recorded through the
 * structured `logger` (so it always lands in our log stream), then — only
 * when `SENTRY_DSN` is configured AND the `@sentry/nextjs` package is
 * installed — forwarded to Sentry.
 *
 * Sentry is strictly optional: it is NOT a project dependency, so the
 * integration is loaded lazily via a runtime dynamic import. If the package
 * is missing (or the DSN is unset) capture degrades silently to logging.
 */
import { logger } from "@/lib/logger";

export interface ErrorContext {
  [key: string]: unknown;
}

type SentryModule = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (error: unknown, options?: Record<string, unknown>) => void;
};

// `undefined` => not yet attempted; `null` => unavailable; object => loaded.
let sentryModule: SentryModule | null | undefined;

/**
 * Lazily load Sentry. The specifier is typed as a plain `string` and the
 * import is marked `webpackIgnore` so the bundler never tries to resolve or
 * include `@sentry/nextjs` — keeping the build green when the package is
 * absent.
 */
async function loadSentry(): Promise<SentryModule | null> {
  if (sentryModule !== undefined) return sentryModule;
  if (!process.env.SENTRY_DSN) {
    sentryModule = null;
    return null;
  }
  try {
    const specifier: string = "@sentry/nextjs";
    const mod = (await import(/* webpackIgnore: true */ specifier)) as SentryModule;
    sentryModule = mod ?? null;
  } catch (err) {
    logger.warn("Sentry unavailable; continuing with logging only", {
      error: String(err),
    });
    sentryModule = null;
  }
  return sentryModule;
}

let initDone = false;

/** Initialize Sentry once. Safe to call repeatedly. No-op without a DSN. */
export async function initErrorMonitoring(): Promise<void> {
  const mod = await loadSentry();
  if (mod?.init && !initDone) {
    mod.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
    initDone = true;
  }
}

/** Capture an error with structured context. Always logs; forwards to Sentry
 *  when configured. Never throws. */
export async function captureError(
  error: unknown,
  context: ErrorContext = {}
): Promise<void> {
  const err =
    error instanceof Error ? error : new Error(String(error ?? "Unknown error"));

  logger.error("Error captured", {
    message: err.message,
    stack: err.stack,
    ...context,
  });

  const mod = await loadSentry();
  if (mod?.captureException) {
    try {
      mod.captureException(err, { extra: context });
    } catch (forwardErr) {
      logger.warn("Sentry capture failed", { error: String(forwardErr) });
    }
  }
}
