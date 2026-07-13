import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementBudgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.budget.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const budget = await db.query.procurementBudgets.findFirst({
    where: and(eq(procurementBudgets.id, id), eq(procurementBudgets.organizationId, ctx.organizationId)),
  });
  if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  return NextResponse.json(budget);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.budget.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();
    const [updated] = await db
      .update(procurementBudgets)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(procurementBudgets.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update budget error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.budget.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  await db.delete(procurementBudgets).where(eq(procurementBudgets.id, id));
  return NextResponse.json({ success: true });
}
