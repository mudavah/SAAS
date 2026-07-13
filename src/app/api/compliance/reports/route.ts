import { NextResponse } from "next/server";
import { db } from "@/db";
import { taxReports } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { taxReportGenerateSchema } from "@/lib/validations";
import { createTaxReport, getPeriodBounds } from "@/lib/compliance/reports";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") || 20))
  );
  const type = url.searchParams.get("type");

  const conditions = [eq(taxReports.organizationId, ctx.organizationId)];
  if (type === "monthly" || type === "quarterly" || type === "annual") {
    conditions.push(eq(taxReports.type, type));
  }

  const rows = await db.query.taxReports.findMany({
    where: and(...conditions),
    orderBy: (r) => [desc(r.periodStart)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return NextResponse.json({ data: rows, page, pageSize });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = taxReportGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    let periodStart = parsed.data.periodStart;
    let periodEnd = parsed.data.periodEnd;

    if (!periodStart || !periodEnd) {
      const anchor = parsed.data.anchorDate ?? new Date();
      const bounds = getPeriodBounds(parsed.data.type, anchor);
      periodStart = bounds.periodStart;
      periodEnd = bounds.periodEnd;
    }

    const { report, data } = await createTaxReport(
      ctx.organizationId,
      ctx.userId!,
      { type: parsed.data.type, periodStart, periodEnd }
    );

    await logAuditSafe(ctx, {
      action: "tax_report.generate",
      category: "compliance",
      resourceType: "tax_report",
      resourceId: report.id,
      description: `Generated ${parsed.data.type} tax report`,
      newValues: { type: parsed.data.type, totals: data.totals },
    });

    return NextResponse.json({ report, data }, { status: 201 });
  } catch (error) {
    console.error("Generate tax report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
