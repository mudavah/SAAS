/**
 * KaziFlow — request monitoring middleware (higher-order)
 * ------------------------------------------------------------------
 * Next.js middleware runs *before* route handlers and cannot observe handler
 * latency or catch handler exceptions. The idiomatic replacement is a
 * higher-order wrapper applied to the route handlers you want instrumented.
 *
 * `withRequestMonitoring`:
 *   - measures request latency and records it in the metrics collector
 *   - logs slow requests (> SLOW_REQUEST_THRESHOLD_MS) as warnings
 *   - catches unhandled errors from the handler, records them, and reports
 *     them through the centralized error monitor with request context
 *
 * `registerGlobalErrorHandlers` hooks `uncaughtException` /
 * `unhandledRejection` and is wired from `src/instrumentation.ts`.
 */
import { NextResponse } from "next/server";
import type { NextResponse as NextResponseType } from "next/server";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/error-monitoring";
import {
  recordApiLatency,
  recordError,
  recordRequest,
} from "@/lib/metrics";

export const SLOW_REQUEST_THRESHOLD_MS = 1000;

export type RouteHandler = (
  req: Request
) => Promise<NextResponseType> | NextResponseType;

function safePathname(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return req.url;
  }
}

/**
 * Wrap a route handler with timing + error tracking. Apply per-handler, e.g.
 *
 *   export const GET = withRequestMonitoring(async (req) => { ... });
 */
export function withRequestMonitoring(handler: RouteHandler): RouteHandler {
  return async (req: Request) => {
    const start = Date.now();
    const method = req.method;
    const path = safePathname(req);

    recordRequest();

    try {
      const res = await handler(req);
      const duration = Date.now() - start;
      recordApiLatency(duration);

      if (duration > SLOW_REQUEST_THRESHOLD_MS) {
        logger.warn("Slow request", {
          method,
          path,
          durationMs: duration,
          status: res.status,
        });
      } else {
        logger.debug("Request completed", {
          method,
          path,
          durationMs: duration,
          status: res.status,
        });
      }
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      recordApiLatency(duration);
      recordError();
      await captureError(error, {
        source: "api-request",
        method,
        path,
        durationMs: duration,
      });
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}

/** Hook process-level fatal errors. Call once from instrumentation. */
export function registerGlobalErrorHandlers(): void {
  if (typeof process === "undefined") return;

  process.on("uncaughtException", (err) => {
    void captureError(err, { source: "uncaughtException" });
  });

  process.on("unhandledRejection", (reason) => {
    void captureError(reason, { source: "unhandledRejection" });
  });

  logger.info("Global error handlers registered");
}
