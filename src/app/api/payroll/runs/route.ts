import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createPayrollRun, getPayrollRuns } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const runs = await getPayrollRuns(ctx.organizationId);
  return NextResponse.json(runs);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payroll.runs.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await createPayrollRun(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.run, { status: result.status });
  } catch (error) {
    console.error("Create payroll run error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
