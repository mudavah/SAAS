import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPayslips } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.payslips.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const payslips = await getPayslips(ctx.organizationId, { runId, employeeId });
  return NextResponse.json(payslips);
}
