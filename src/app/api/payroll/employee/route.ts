import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getEmployeePortalData } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.payslips.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const result = await getEmployeePortalData(ctx);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { status: result.status });
}
