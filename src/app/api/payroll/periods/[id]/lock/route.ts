import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { lockPayrollPeriod } from "@/lib/payroll/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.periods.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const result = await lockPayrollPeriod(ctx, routeId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.period, { status: result.status });
}