import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createPayrollPeriod, getPayrollPeriods } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const periods = await getPayrollPeriods(ctx.organizationId);
  return NextResponse.json(periods);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payroll.periods.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await createPayrollPeriod(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.period, { status: result.status });
  } catch (error) {
    console.error("Create payroll period error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
