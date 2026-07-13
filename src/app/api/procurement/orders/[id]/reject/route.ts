import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { decidePurchaseOrder } from "@/lib/procurement/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.approve");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  let comments: string | undefined;
  try {
    const body = await req.json();
    comments = body?.comments;
  } catch {
    /* no body */
  }

  const result = await decidePurchaseOrder(ctx, id, "reject", comments);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.po, { status: result.status });
}
