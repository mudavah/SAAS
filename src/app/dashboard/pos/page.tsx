import { redirect } from "next/navigation";
import { db } from "@/db";
import { posOrders, posSessions } from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Store, ShoppingCart, TrendingUp, Clock, ArrowUpRight, Banknote } from "lucide-react";

async function getPosStats(organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todaySales,
    todayOrders,
    openSession,
    recentOrders,
  ] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${posOrders.total}),0)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, today)
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.completedAt, today)
      )),
    db.query.posSessions.findFirst({
      where: and(
        eq(posSessions.organizationId, organizationId),
        eq(posSessions.status, "open")
      ),
      orderBy: (s, { desc }) => [desc(s.openedAt)],
    }),
    db.query.posOrders.findMany({
      where: and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed")
      ),
      orderBy: (o, { desc }) => [desc(o.completedAt)],
      limit: 10,
      with: {
        client: { columns: { id: true, name: true } },
        payments: { limit: 1, columns: { method: true, amount: true } },
      },
    }),
  ]);

  return {
    todaySales: Number(todaySales[0]?.total ?? 0),
    todayOrders: Number(todayOrders[0]?.count ?? 0),
    openSession: openSession ?? null,
    recentOrders: recentOrders as any[],
  };
}

export default async function PosPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const hasPermission = ["owner", "administrator", "manager", "cashier", "sales_representative"].includes(ctx.roleType);
  if (!hasPermission) {
    redirect("/dashboard");
  }

  const stats = await getPosStats(ctx.organizationId);

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Point of Sale</h1>
            <p className="text-muted-foreground mt-1">
              Process sales, manage cashier shifts, and track performance
            </p>
          </div>
          <div className="flex gap-2">
            {!stats.openSession && (
              <Link href="/dashboard/pos/sessions">
                <Button variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  Open Shift
                </Button>
              </Link>
            )}
            <Link href="/dashboard/pos/new">
              <Button variant="kazi">
                <ShoppingCart className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&apos;s Sales
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-green">
                {formatCurrency(stats.todaySales)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders Today
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Shift
              </CardTitle>
              <Clock className="h-4 w-4 text-kazi-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.openSession ? (
                  <Badge variant="secondary" className="text-kazi-green">
                    Open
                  </Badge>
                ) : (
                  <Badge variant="outline">Closed</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Order Value
              </CardTitle>
              <Banknote className="h-4 w-4 text-kazi-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.todayOrders > 0
                  ? formatCurrency(stats.todaySales / stats.todayOrders)
                  : formatCurrency(0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No orders yet. Start a new sale to see it here.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/pos`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kazi-green/10">
                        <Store className="h-5 w-5 text-kazi-green" />
                      </div>
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.client?.name || "Walk-in Customer"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.total)}</p>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "draft"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
