import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createSalaryStructure, getSalaryStructures } from "@/lib/payroll/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const structures = await getSalaryStructures(ctx.organizationId);
  return NextResponse.json(structures);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payroll.salary_structures.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const result = await createSalaryStructure(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.structure, { status: result.status });
  } catch (error) {
    logger.error("Create salary structure error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
