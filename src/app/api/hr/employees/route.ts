import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createEmployee, getEmployees } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.employees.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const employees = await getEmployees(ctx.organizationId);
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.employees.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createEmployee(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.employee, { status: result.status });
  } catch (error) {
    logger.error("Create employee error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
