import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { createGrn } from "@/lib/procurement/service";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.grn.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params; // purchase order id

  try {
    const body = await req.json();
    const result = await createGrn(ctx, id, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.grn, { status: result.status });
  } catch (error) {
    logger.error("Create GRN error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
