import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { retryFailedSubmissions } from "@/lib/compliance/engine";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json().catch(() => ({}));
  const recordIds: string[] | undefined = Array.isArray(body.recordIds)
    ? body.recordIds
    : undefined;

  const results = await retryFailedSubmissions(ctx, recordIds);
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    success: true,
    total: results.length,
    succeeded,
    failed,
    results,
  });
}
