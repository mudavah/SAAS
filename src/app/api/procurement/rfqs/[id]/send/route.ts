import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { sendRfq } from "@/lib/procurement/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.rfq.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const result = await sendRfq(ctx, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.rfq, { status: result.status });
}
