import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { approvePayrollRun } from "@/lib/payroll/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.runs.approve");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await approvePayrollRun(ctx, routeId, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.run, { status: result.status });
  } catch (error) {
    console.error("Approve payroll run error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}