import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getContracts, createContract } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.employees.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;

  const contracts = await getContracts(ctx.organizationId, employeeId);
  return NextResponse.json(contracts);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.employees.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createContract(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.contract, { status: result.status });
  } catch (error) {
    logger.error("Create contract error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
