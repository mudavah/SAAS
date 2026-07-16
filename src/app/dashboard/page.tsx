import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, clients, payments, expenses } from "@/db/schema";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { DashboardOverview } from "@/components/dashboard/overview";
import { DashboardTourLauncher } from "@/components/dashboard/tour-launcher";
import { getActiveOrganization } from "@/lib/org";

async function getDashboardStats(organizationId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingInvoices, clientCount, monthlyRevenue, monthlyExpenses] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            sql`${invoices.status} IN ('sent', 'viewed', 'partial', 'overdue')`
          )
        ),
      db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.organizationId, organizationId)),
      db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, organizationId),
            eq(payments.status, "completed"),
            gte(payments.createdAt, startOfMonth)
          )
        ),
      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(eq(expenses.organizationId, organizationId), gte(expenses.date, startOfMonth))
        ),
    ]);

  const recentInvoices = await db.query.invoices.findMany({
    where: eq(invoices.organizationId, organizationId),
    orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
    limit: 5,
    with: { client: true },
  }) as any[];

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
  if (!session?.user?.id) return null;

  const org = await getActiveOrganization(session.user.id);
  if (!org) return null;

  const stats = await getDashboardStats(org.organization.id);

  return (
    <DashboardShell>
      <DashboardTourLauncher />
      <DashboardOverview stats={stats} userName={session.user.name || ""} />
    </DashboardShell>
  );
}
