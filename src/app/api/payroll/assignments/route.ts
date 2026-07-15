import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { assignEmployeeSalary, getEmployeeSalaryAssignments } from "@/lib/payroll/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const assignments = await getEmployeeSalaryAssignments(ctx.organizationId, employeeId);
  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payroll.salary_structures.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await assignEmployeeSalary(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.assignment, { status: result.status });
  } catch (error) {
    logger.error("Assign employee salary error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
