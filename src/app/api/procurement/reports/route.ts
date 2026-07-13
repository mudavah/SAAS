import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getProcurementReports } from "@/lib/procurement/metrics";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const reports = await getProcurementReports(ctx.organizationId);
  return NextResponse.json(reports);
}
