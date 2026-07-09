import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payments, expenses, invoices } from "@/db/schema";
import { eq, and, gte, sum, count } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await auth();
  const userId = session!.user!.id;
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const [revenue, totalExpenses, invoiceStats, taxDeductible] = await Promise.all([
    db.select({ total: sum(payments.amount) }).from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.status, "completed"), gte(payments.createdAt, startOfYear))),
    db.select({ total: sum(expenses.amount) }).from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.date, startOfYear))),
    db.select({ count: count(), total: sum(invoices.total) }).from(invoices)
      .where(and(eq(invoices.userId, userId), gte(invoices.createdAt, startOfYear))),
    db.select({ total: sum(expenses.amount) }).from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.taxDeductible, true), gte(expenses.date, startOfYear))),
  ]);

  const rev = parseFloat(revenue[0]?.total || "0");
  const exp = parseFloat(totalExpenses[0]?.total || "0");
  const vatCollected = rev * 0.16 / 1.16;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Year-to-date business summary ({new Date().getFullYear()})</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-kazi-green">{formatCurrency(rev)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(exp)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${rev - exp >= 0 ? "text-kazi-green" : "text-destructive"}`}>{formatCurrency(rev - exp)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Invoices Issued</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{invoiceStats[0]?.count ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Est. VAT Collected</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(vatCollected)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Tax Deductible Expenses</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(taxDeductible[0]?.total || "0")}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Tax Report Note</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>These are simplified estimates for Kenyan VAT (16%) and expense tracking. Consult a qualified accountant for official KRA tax filings. KaziFlow Pro includes detailed tax export (coming soon).</p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
