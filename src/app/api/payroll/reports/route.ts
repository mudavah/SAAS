import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPayrollReports } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const report = await getPayrollReports(ctx.organizationId);
  return NextResponse.json(report);
}
