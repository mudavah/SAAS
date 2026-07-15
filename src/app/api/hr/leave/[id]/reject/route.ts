import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { rejectLeave } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "hr.leave.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await _req.json();
    const { rejectionReason } = body as { rejectionReason?: string };
    const result = await rejectLeave(ctx, routeId, rejectionReason || "");
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.leaveRequest);
  } catch (error) {
    logger.error("Reject leave error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
