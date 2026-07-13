import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe. Returns 200 as long as the Node process is running —
 *  it does not depend on any external system. Use for container restarts. */
export async function GET() {
  return NextResponse.json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
}
