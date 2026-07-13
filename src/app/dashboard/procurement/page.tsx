import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  FileText,
  Truck,
  Receipt,
  CreditCard,
  Package,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getProcurementDashboard } from "@/lib/procurement/metrics";
import { getLowStockProducts } from "@/lib/procurement/metrics";
import { getOpenRecommendations } from "@/lib/procurement/recommendations";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const [dashboard, lowStock, recommendations] = await Promise.all([
    getProcurementDashboard(ctx.organizationId),
    getLowStockProducts(ctx.organizationId),
    getOpenRecommendations(ctx.organizationId),
  ]);

  const statCards = [
    {
      label: "Purchase Requests",
      value: dashboard.counts.requests,
      href: "/dashboard/procurement/requests",
      icon: FileText,
      color: "text-kazi-blue",
    },
    {
      label: "Purchase Orders",
      value: dashboard.counts.purchaseOrders,
      href: "/dashboard/procurement/orders",
      icon: ShoppingCart,
      color: "text-kazi-green",
    },
    {
      label: "Goods Received",
      value: dashboard.counts.grns,
      href: "/dashboard/procurement/grns",
      icon: Truck,
      color: "text-kazi-orange",
    },
    {
      label: "Invoices",
      value: dashboard.counts.invoices,
      href: "/dashboard/procurement/invoices",
      icon: Receipt,
      color: "text-kazi-blue",
    },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Procurement</h1>
            <p className="text-muted-foreground mt-1">
              Manage purchases end-to-end — from request to payment
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/procurement/requests">
              <Button variant="kazi">
                <FileText className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </Link>
            <Link href="/dashboard/procurement/orders">
              <Button variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase Order
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Link key={s.label} href={s.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.label}
                  </CardTitle>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Commitment
              </CardTitle>
              <Wallet className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboard.totalCommitment)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Approved & ordered POs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spend
              </CardTitle>
              <Receipt className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboard.totalSpend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
              <Clock className="h-4 w-4 text-kazi-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-orange">
                {dashboard.pendingApprovals}
              </div>
              <Link href="/dashboard/procurement/approvals">
                <Button variant="ghost" size="sm" className="mt-1 h-7 px-0">
                  Review <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-kazi-orange" />
                Low Stock Suggestions
              </CardTitle>
              <Badge variant="secondary">{lowStock.length}</Badge>
            </CardHeader>
            <CardContent>
              {lowStock.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>All stock levels look healthy</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {lowStock.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.totalStock} / min {p.minStockLevel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          Reorder {p.suggestedReorderQty}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/dashboard/procurement/low-stock">
                    <Button variant="outline" size="sm" className="w-full">
                      View all suggestions <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-kazi-blue" />
                AI Recommendations
              </CardTitle>
              <Badge variant="secondary">{recommendations.length}</Badge>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No open recommendations</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recommendations.slice(0, 8).map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        <Badge
                          variant={
                            r.priority === "high" ? "destructive" : "secondary"
                          }
                          className="shrink-0"
                        >
                          {r.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {r.description}
                      </p>
                    </div>
                  ))}
                  <Link href="/dashboard/procurement/recommendations">
                    <Button variant="outline" size="sm" className="w-full">
                      View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/procurement/rfqs", label: "RFQs", icon: FileText },
            { href: "/dashboard/procurement/quotations", label: "Quotations", icon: FileText },
            { href: "/dashboard/procurement/suppliers", label: "Suppliers", icon: Package },
            { href: "/dashboard/procurement/payments", label: "Payments", icon: CreditCard },
            { href: "/dashboard/procurement/returns", label: "Returns", icon: Truck },
            { href: "/dashboard/procurement/budgets", label: "Budgets", icon: Wallet },
            { href: "/dashboard/procurement/reports", label: "Reports", icon: Receipt },
            { href: "/dashboard/procurement/approvals", label: "Approvals", icon: CheckCircle2 },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-3 pt-6">
                  <item.icon className="h-5 w-5 text-kazi-green" />
                  <span className="font-medium text-sm">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
