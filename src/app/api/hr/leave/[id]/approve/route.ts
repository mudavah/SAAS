import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { approveLeave } from "@/lib/hr/service";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const res = await requireApiContext(_req, "hr.leave.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const result = await approveLeave(ctx, params.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.leaveRequest);
}
