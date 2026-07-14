import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPayrollInsights, refreshPayrollInsights, createPayrollInsight } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const insights = await getPayrollInsights(ctx.organizationId, ctx.userId!);
  return NextResponse.json(insights);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payroll.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && body.action === "refresh") {
      const result = await refreshPayrollInsights(ctx);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ insights: result.insights }, { status: result.status });
    }
    const result = await createPayrollInsight(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.insight, { status: result.status });
  } catch (error) {
    console.error("Payroll insight error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
