import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { analyticsReportRuns } from "@/db/schema";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "analytics.export");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { reportType, format, periodStart, periodEnd, parameters } = body;

  const [run] = await db
    .insert(analyticsReportRuns)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      reportType,
      format,
      status: "pending",
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      parameters: parameters ?? {},
    })
    .returning();

  return NextResponse.json({ runId: run.id });
}
