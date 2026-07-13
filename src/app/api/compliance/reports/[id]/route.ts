import { NextResponse } from "next/server";
import { db } from "@/db";
import { taxReports } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getTaxReportData } from "@/lib/compliance/reports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const report = await db.query.taxReports.findFirst({
    where: and(
      eq(taxReports.id, id),
      eq(taxReports.organizationId, ctx.organizationId)
    ),
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const data = await getTaxReportData(ctx.organizationId, report);
  return NextResponse.json({ report, data });
}
