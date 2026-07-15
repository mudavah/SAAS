import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getAttendanceRecords, recordAttendance } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.attendance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;
  const startDate = url.searchParams.get("startDate") ? new Date(url.searchParams.get("startDate")!) : undefined;
  const endDate = url.searchParams.get("endDate") ? new Date(url.searchParams.get("endDate")!) : undefined;

  const records = await getAttendanceRecords(ctx.organizationId, employeeId, startDate, endDate);
  return NextResponse.json(records);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.attendance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await recordAttendance(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.record, { status: result.status });
  } catch (error) {
    logger.error("Record attendance error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
