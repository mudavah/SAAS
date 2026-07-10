import { NextResponse } from "next/server";
import { db } from "@/db";
import { chartOfAccounts } from "@/db/schema";
import { chartOfAccountsSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash", type: "asset" as const },
  { code: "1010", name: "Bank", type: "asset" as const },
  { code: "1200", name: "Accounts Receivable", type: "asset" as const },
  { code: "1500", name: "Inventory", type: "asset" as const },
  { code: "2000", name: "Accounts Payable", type: "liability" as const },
  { code: "2100", name: "M-Pesa Liability", type: "liability" as const },
  { code: "3000", name: "Owner's Equity", type: "equity" as const },
  { code: "4000", name: "Sales Revenue", type: "income" as const },
  { code: "4100", name: "Service Revenue", type: "income" as const },
  { code: "5000", name: "Cost of Goods Sold", type: "expense" as const },
  { code: "6000", name: "Operating Expenses", type: "expense" as const },
  { code: "6100", name: "Salaries & Wages", type: "expense" as const },
  { code: "6200", name: "Rent", type: "expense" as const },
  { code: "6300", name: "Utilities", type: "expense" as const },
  { code: "6400", name: "Marketing", type: "expense" as const },
  { code: "6500", name: "Office Supplies", type: "expense" as const },
];

export async function GET(req: Request) {
  const res = await requireApiContext(req, "bookkeeping.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  let accounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.organizationId, ctx.organizationId),
    orderBy: (accounts) => [asc(accounts.code)],
  });

  if (accounts.length === 0) {
    await db.insert(chartOfAccounts).values(
      DEFAULT_ACCOUNTS.map((acc) => ({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        isActive: true,
      }))
    );
    accounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.organizationId, ctx.organizationId),
      orderBy: (accounts) => [asc(accounts.code)],
    });
  }

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "bookkeeping.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = chartOfAccountsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [account] = await db
      .insert(chartOfAccounts)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "account.create",
      category: "bookkeeping",
      resourceType: "account",
      resourceId: account.id,
      description: `Created account ${account.name} (${account.code})`,
      newValues: { code: account.code, name: account.name, type: account.type },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
