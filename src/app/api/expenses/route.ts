import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { expenseSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userExpenses = await db.query.expenses.findMany({
    where: eq(expenses.userId, session.user.id),
    orderBy: (expenses, { desc }) => [desc(expenses.date)],
  });

  return NextResponse.json(userExpenses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        userId: session.user.id,
        ...parsed.data,
        amount: parsed.data.amount.toFixed(2),
      })
      .returning();

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
