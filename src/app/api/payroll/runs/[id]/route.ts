import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPayrollRun } from "@/lib/payroll/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const run = await getPayrollRun(ctx.organizationId, routeId);
  if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
  return NextResponse.json(run);
}