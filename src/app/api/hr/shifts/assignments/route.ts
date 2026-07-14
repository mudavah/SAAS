import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { assignShift, getShiftAssignments } from "@/lib/hr/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.shifts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;
  const startDate = url.searchParams.get("startDate") ? new Date(url.searchParams.get("startDate")!) : undefined;
  const endDate = url.searchParams.get("endDate") ? new Date(url.searchParams.get("endDate")!) : undefined;

  const assignments = await getShiftAssignments(ctx.organizationId, employeeId, startDate, endDate);
  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.shifts.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await assignShift(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.assignment, { status: result.status });
  } catch (error) {
    console.error("Assign shift error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
