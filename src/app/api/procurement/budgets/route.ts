import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementBudgets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createBudget } from "@/lib/procurement/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.budget.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const budgets = await db.query.procurementBudgets.findMany({
    where: eq(procurementBudgets.organizationId, ctx.organizationId),
    orderBy: (b) => [desc(b.periodStart)],
  });
  return NextResponse.json(budgets);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.budget.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createBudget(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.budget, { status: result.status });
  } catch (error) {
    console.error("Create budget error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
