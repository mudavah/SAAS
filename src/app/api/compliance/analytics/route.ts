import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getComplianceAnalytics } from "@/lib/compliance/analytics";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const url = new URL(req.url);
  const months = Math.min(24, Math.max(1, Number(url.searchParams.get("months") || "6")));

  const data = await getComplianceAnalytics(ctx.organizationId, months);
  return NextResponse.json(data);
}
