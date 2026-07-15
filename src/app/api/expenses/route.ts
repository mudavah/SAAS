import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { expenseSchema } from "@/lib/validations";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "expenses.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.expenses.findMany({
    where: eq(expenses.organizationId, ctx.organizationId),
    orderBy: (expenses, { desc }) => [desc(expenses.date)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "expenses.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
        amount: parsed.data.amount.toFixed(2),
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "expense.create",
      category: "expenses",
      resourceType: "expense",
      resourceId: expense.id,
      description: `Added expense ${expense.description}`,
      newValues: { amount: expense.amount, category: expense.category },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "finance",
      type: "expense_added",
      title: "Expense added",
      message: `Expense "${expense.description}" of ${expense.amount} added.`,
      deepLink: "/dashboard/expenses",
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    logger.error("Create expense error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
