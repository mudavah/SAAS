import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, clients, payments, expenses } from "@/db/schema";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { DashboardOverview } from "@/components/dashboard/overview";

async function getDashboardStats(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingInvoices, clientCount, monthlyRevenue, monthlyExpenses] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, userId),
            sql`${invoices.status} IN ('sent', 'viewed', 'partial', 'overdue')`
          )
        ),
      db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.userId, userId)),
      db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            eq(payments.userId, userId),
            eq(payments.status, "completed"),
            gte(payments.createdAt, startOfMonth)
          )
        ),
      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(eq(expenses.userId, userId), gte(expenses.date, startOfMonth))
        ),
    ]);

  const recentInvoices = await db.query.invoices.findMany({
    where: eq(invoices.userId, userId),
    orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
    limit: 5,
    with: {
      client: true,
    },
  });

  return {
    pendingInvoices: pendingInvoices[0]?.count ?? 0,
    activeClients: clientCount[0]?.count ?? 0,
    monthlyRevenue: monthlyRevenue[0]?.total ?? "0",
    monthlyExpenses: monthlyExpenses[0]?.total ?? "0",
    recentInvoices,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats(session!.user!.id);

  return (
    <DashboardShell>
      <DashboardOverview stats={stats} userName={session!.user!.name || ""} />
    </DashboardShell>
  );
}
