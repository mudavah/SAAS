import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPayslip } from "@/lib/payroll/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "payroll.payslips.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const payslip = await getPayslip(ctx.organizationId, routeId);
  if (!payslip) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  return NextResponse.json(payslip);
}