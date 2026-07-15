/**
 * KaziFlow — runtime instrumentation
 * ------------------------------------------------------------------
 * Next.js calls `register()` once when the server boots (Node.js runtime).
 * Used to wire global error handlers and initialize optional Sentry without
 * touching the request path of every route.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [
    { registerGlobalErrorHandlers },
    { initErrorMonitoring },
    { validateProductionEnv },
  ] = await Promise.all([
    import("@/lib/monitoring/middleware"),
    import("@/lib/error-monitoring"),
    import("@/lib/config/env"),
  ]);

  registerGlobalErrorHandlers();
  await initErrorMonitoring();
  // Non-fatal: logs a checklist of missing env keys; never throws.
  validateProductionEnv();
}
