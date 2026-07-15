import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getLeaveRequests, requestLeave } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.leave.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;
  const status = url.searchParams.get("status") || undefined;

  const requests = await getLeaveRequests(ctx.organizationId, employeeId, status);
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.leave.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await requestLeave(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.leaveRequest, { status: result.status });
  } catch (error) {
    logger.error("Request leave error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
