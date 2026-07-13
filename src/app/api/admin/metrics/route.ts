import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSnapshot, markUserActive } from "@/lib/metrics";
import { withRequestMonitoring } from "@/lib/monitoring/middleware";

export const dynamic = "force-dynamic";

async function handler(req: Request): Promise<NextResponse> {
  const session = await auth();
  const role = (session?.user as { roleType?: string } | undefined)
    ?.roleType;

  if (role !== "owner" && role !== "administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session?.user?.id) markUserActive(session.user.id);

  return NextResponse.json(getSnapshot());
}

export const GET = withRequestMonitoring(handler);
