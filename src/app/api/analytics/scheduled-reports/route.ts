import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { analyticsScheduledReports } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "analytics.scheduled_reports.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const reports = await db
    .select()
    .from(analyticsScheduledReports)
    .where(eq(analyticsScheduledReports.organizationId, ctx.organizationId));
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "analytics.scheduled_reports.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { name, description, reportType, config, format, frequency, recipients } = body;

  const [report] = await db
    .insert(analyticsScheduledReports)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name,
      description,
      reportType,
      config: config ?? {},
      format,
      frequency,
      recipients: recipients ?? [],
    })
    .returning();

  return NextResponse.json(report);
}
