import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, payments, expenses, clients } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "reports.view_financial", async (ctx: ServerContext) => {
    const invoiceAgg = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${invoices.total}::numeric), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.organizationId, ctx.organizationId));

    const paymentAgg = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
      })
      .from(payments)
      .where(eq(payments.organizationId, ctx.organizationId));

    const expenseAgg = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)`,
      })
      .from(expenses)
      .where(eq(expenses.organizationId, ctx.organizationId));

    const clientAgg = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(eq(clients.organizationId, ctx.organizationId));

    const recentInvoices = await db.query.invoices.findMany({
      where: eq(invoices.organizationId, ctx.organizationId),
      orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
      limit: 10,
    });

    const data = {
      invoices: { count: invoiceAgg[0]?.count ?? 0, total: invoiceAgg[0]?.total ?? "0" },
      payments: { count: paymentAgg[0]?.count ?? 0, total: paymentAgg[0]?.total ?? "0" },
      expenses: { count: expenseAgg[0]?.count ?? 0, total: expenseAgg[0]?.total ?? "0" },
      clients: { count: clientAgg[0]?.count ?? 0 },
      recentInvoices,
    };

    return NextResponse.json({ data }, { headers: getCorsHeaders(req) });
  });
}
