import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: "unknown",
    },
  };

  try {
    await db.select({ now: sql`now()` }).from(sql`(SELECT 1) as t`);
    checks.checks.database = "healthy";
  } catch {
    checks.checks.database = "unhealthy";
    checks.status = "unhealthy";
  }

  const isHealthy = checks.status === "healthy";
  return NextResponse.json(checks, { status: isHealthy ? 200 : 503 });
}
