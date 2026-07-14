import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createDepartment, getDepartments } from "@/lib/hr/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.departments.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const departments = await getDepartments(ctx.organizationId);
  return NextResponse.json(departments);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.departments.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createDepartment(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.department, { status: result.status });
  } catch (error) {
    console.error("Create department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
