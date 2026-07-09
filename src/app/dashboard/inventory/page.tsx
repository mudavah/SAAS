import { auth } from "@/lib/auth";
import { db } from "@/db";
import { inventoryProducts, inventoryStock, inventoryStockMovements, usageRecords } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Package, AlertTriangle, ArrowUpRight, TrendingUp, Plus, Boxes } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

async function getInventoryStats(userId: string) {
  const [totalProducts, lowStockProducts, totalStockValue, recentMovements] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(inventoryProducts).where(eq(inventoryProducts.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(inventoryProducts)
      .innerJoin(inventoryStock, eq(inventoryStock.productId, inventoryProducts.id))
      .where(and(eq(inventoryProducts.userId, userId), sql`${inventoryStock.quantity} <= ${inventoryProducts.minStockLevel}`)),
    db.select({ total: sql<string>`sum(${inventoryStock.quantity} * ${inventoryProducts.costPrice})` }).from(inventoryStock)
      .innerJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
      .where(eq(inventoryProducts.userId, userId)),
    db.select().from(inventoryStockMovements)
      .where(eq(inventoryStockMovements.userId, userId))
      .orderBy((movements) => [desc(movements.createdAt)])
      .limit(10),
  ]);

  return {
    totalProducts: totalProducts[0]?.count ?? 0,
    lowStockProducts: lowStockProducts[0]?.count ?? 0,
    totalStockValue: totalStockValue[0]?.total ?? "0",
    recentMovements: recentMovements || [],
  };
}

export default async function InventoryPage() {
  const session = await auth();
  const stats = await getInventoryStats(session!.user!.id);

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-1">
              Track stock, manage products, and control purchases
            </p>
          </div>
          <Link href="/dashboard/inventory/products/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock Alerts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-kazi-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-orange">
                {stats.lowStockProducts}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inventory Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalStockValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Activity
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentMovements.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Stock Movements</CardTitle>
              <Link href="/dashboard/inventory/stock-movements">
                <Button variant="ghost" size="sm">
                  View all <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentMovements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No stock movements yet</p>
                  <Link href="/dashboard/inventory/products/new">
                    <Button variant="kazi" size="sm" className="mt-4">
                      Add Your First Product
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentMovements.map((movement: any) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {movement.product?.name || "Unknown Product"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.type} · {movement.warehouseId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${parseFloat(movement.quantity) > 0 ? "text-kazi-green" : "text-destructive"}`}>
                          {parseFloat(movement.quantity) > 0 ? "+" : ""}{movement.quantity}
                        </p>
                      </div>
                    </div>
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
              <Link href="/dashboard/inventory/products/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
              <Link href="/dashboard/inventory/categories" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Boxes className="mr-2 h-4 w-4" />
                  Categories
                </Button>
              </Link>
              <Link href="/dashboard/inventory/products" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  All Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
