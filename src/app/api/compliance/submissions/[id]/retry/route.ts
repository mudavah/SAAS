import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { retrySubmission } from "@/lib/compliance/engine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const result = await retrySubmission(ctx, id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
