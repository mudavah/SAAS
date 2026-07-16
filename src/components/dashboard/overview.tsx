import Link from "next/link";
import {
  FileText,
  Users,
  TrendingUp,
  Receipt,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContextualHelp } from "@/components/ux/contextual-help";
import { EmptyState } from "@/components/ux/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardOverviewProps {
  userName: string;
  stats: {
    pendingInvoices: number;
    activeClients: number;
    monthlyRevenue: string;
    monthlyExpenses: string;
    recentInvoices: Array<{
      id: string;
      invoiceNumber: string;
      status: string;
      total: string;
      dueDate: Date;
      client: { name: string } | null;
    }>;
  };
}

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  draft: "default",
  sent: "info",
  viewed: "info",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "default",
};

export function DashboardOverview({ userName, stats }: DashboardOverviewProps) {
  const profit =
    parseFloat(stats.monthlyRevenue) - parseFloat(stats.monthlyExpenses);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Karibu, {userName.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s how your business is doing this month.
          </p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button variant="kazi">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-tour="stats-pending">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              Pending Invoices
              <ContextualHelp
                label="Pending invoices"
                content="Invoices that have been sent but not yet paid in full. Lower is better — send reminders to collect faster."
              />
            </CardTitle>
            <FileText className="h-4 w-4 text-kazi-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
          </CardContent>
        </Card>

        <Card data-tour="stats-clients">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
            <Users className="h-4 w-4 text-kazi-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
          </CardContent>
        </Card>

        <Card data-tour="stats-revenue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue (Month)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-kazi-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card data-tour="stats-net">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net (Month)
            </CardTitle>
            <Receipt className="h-4 w-4 text-kazi-green" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${profit >= 0 ? "text-kazi-green" : "text-destructive"}`}
            >
              {formatCurrency(profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions + recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link href="/dashboard/invoices">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentInvoices.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No invoices yet"
                description="Create your first invoice to start getting paid. It only takes a minute."
                action={
                  <Link href="/dashboard/invoices/new">
                    <Button variant="kazi" size="sm">
                      Create Invoice
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {stats.recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.client?.name || "No client"} · Due{" "}
                        {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(invoice.total)}
                      </p>
                      <Badge
                        variant={statusColors[invoice.status] || "default"}
                        className="text-xs capitalize"
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/invoices/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
            <Link href="/dashboard/clients/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </Link>
            <Link href="/dashboard/payments" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </Link>
            <Link href="/dashboard/expenses/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="mr-2 h-4 w-4" />
                Log Expense
              </Button>
            </Link>
            <Link href="/dashboard/ai" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
