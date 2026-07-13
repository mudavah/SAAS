import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  draft: "default",
  sent: "info",
  viewed: "info",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "default",
};

export default async function InvoicesPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const userInvoices = await db.query.invoices.findMany({
    where: eq(invoices.organizationId, ctx.organizationId),
    orderBy: [desc(invoices.createdAt)],
    with: { client: true },
  }) as any[];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">
              Create, send, and track your invoices
            </p>
          </div>
          <Link href="/dashboard/invoices/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>

        {userInvoices.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <p className="text-muted-foreground mb-4">No invoices yet</p>
            <Link href="/dashboard/invoices/new">
              <Button variant="kazi">Create Your First Invoice</Button>
            </Link>
          </div>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Invoice</th>
                    <th className="text-left p-4 font-medium hidden sm:table-cell">
                      Client
                    </th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">
                      Due Date
                    </th>
                    <th className="text-right p-4 font-medium">Amount</th>
                    <th className="text-center p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="font-medium hover:text-kazi-green"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">
                        {invoice.client?.name || "—"}
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant={statusColors[invoice.status] || "default"}
                          className="capitalize"
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
