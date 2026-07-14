import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { updateSalaryStructureComponent, deleteSalaryStructureComponent } from "@/lib/payroll/service";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.salary_structures.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await updateSalaryStructureComponent(ctx, routeId, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.component, { status: result.status });
  } catch (error) {
    console.error("Update component error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.salary_structures.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const result = await deleteSalaryStructureComponent(ctx, routeId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true }, { status: result.status });
}