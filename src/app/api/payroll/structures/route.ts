import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createSalaryStructure, getSalaryStructures } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const structures = await getSalaryStructures(ctx.organizationId);
  return NextResponse.json(structures);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payroll.salary_structures.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await createSalaryStructure(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.structure, { status: result.status });
  } catch (error) {
    console.error("Create salary structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
