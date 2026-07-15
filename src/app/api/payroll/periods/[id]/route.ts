import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPayrollPeriod, updatePayrollPeriod, deletePayrollPeriod } from "@/lib/payroll/service";
import { logger } from "@/lib/logger";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const period = await getPayrollPeriod(ctx.organizationId, routeId);
  if (!period) return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
  return NextResponse.json(period);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.periods.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await updatePayrollPeriod(ctx, routeId, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.period, { status: result.status });
  } catch (error) {
    logger.error("Update payroll period error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.periods.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const result = await deletePayrollPeriod(ctx, routeId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true }, { status: result.status });
}