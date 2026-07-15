import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { generatePaymentExport } from "@/lib/payroll/service";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.export");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await generatePaymentExport(ctx, routeId, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.export, { status: result.status });
  } catch (error) {
    logger.error("Generate payment export error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}