import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getProcurementAdvice } from "@/lib/procurement/recommendations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const advice = await getProcurementAdvice(ctx.organizationId);
  return NextResponse.json({ advice });
}
