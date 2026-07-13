import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { decideQuotation } from "@/lib/procurement/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.quotations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const result = await decideQuotation(ctx, id, "reject");
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.quotation, { status: result.status });
}
