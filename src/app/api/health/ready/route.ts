import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { cache, redisAvailable } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * Readiness probe. Verifies the app can reach its primary dependencies.
 * The database is the hard gate (503 when disconnected — suitable for load
 * balancer / rolling-deploy gating). Cache state is reported but non-fatal:
 * the in-memory fallback keeps the API functional when Redis is unavailable.
 */
export async function GET() {
  let database = "connected";
  let dbError: string | undefined;
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    database = "disconnected";
    dbError = error instanceof Error ? error.message : String(error);
  }

  let cacheStatus = "unavailable";
  try {
    await cache.set("__kf_ready_probe__", 1, 5);
    cacheStatus = redisAvailable() ? "redis" : "memory";
  } catch {
    cacheStatus = "error";
  }

  const ready = database === "connected";
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      database,
      cache: cacheStatus,
      timestamp: new Date().toISOString(),
      ...(dbError ? { error: dbError } : {}),
    },
    { status: ready ? 200 : 503 }
  );
}
