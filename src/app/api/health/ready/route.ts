import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Readiness probe. Verifies the app can reach its primary dependency (the
 * database). Returns 200 when ready, 503 when not — suitable for load
 * balancer / rolling-deploy gating.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "not_ready",
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
