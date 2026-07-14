import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "analytics.export");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { reportType, format, startDate, endDate } = body;

  const url = `/api/analytics/reports/export/${reportType}-${ctx.organizationId}-${Date.now()}.${format}`;

  return NextResponse.json({
    reportType,
    format,
    startDate,
    endDate,
    exportUrl: url,
  });
}
