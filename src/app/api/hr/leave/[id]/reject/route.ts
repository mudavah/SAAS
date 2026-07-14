import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { rejectLeave } from "@/lib/hr/service";

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
    console.error("Reject leave error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
