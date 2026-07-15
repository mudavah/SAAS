import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createSalaryStructureComponent } from "@/lib/payroll/service";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.salary_structures.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await createSalaryStructureComponent(ctx, { ...body, salaryStructureId: routeId });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.component, { status: result.status });
  } catch (error) {
    logger.error("Create salary structure component error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}