/**
 * KaziFlow — POS AI insights
 * ------------------------------------------------------------------
 * Produces rule-based sales insights for the POS dashboard.
 */
import { db } from "@/db";
import { posOrders, inventoryProducts, inventoryStock, complianceAlerts } from "@/db/schema";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import { getCurrentMonth } from "@/lib/utils";

export interface PosInsight {
  type: string;
  title: string;
  description: string;
  priority: "normal" | "high" | "urgent";
  data: Record<string, unknown>;
}

export async function generatePosInsights(organizationId: string): Promise<PosInsight[]> {
  const insights: PosInsight[] = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlySales, monthlyOrders, lowStock, failedEtims] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${posOrders.total}),0)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.createdAt, monthStart)
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(posOrders)
      .where(and(
        eq(posOrders.organizationId, organizationId),
        eq(posOrders.status, "completed"),
        gte(posOrders.createdAt, monthStart)
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(inventoryStock)
      .innerJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
      .where(and(
        eq(inventoryProducts.organizationId, organizationId),
        sql`coalesce(${inventoryStock.quantity},0) <= ${inventoryProducts.reorderPoint}`
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(complianceAlerts)
      .where(and(
        eq(complianceAlerts.organizationId, organizationId),
        eq(complianceAlerts.resolved, false),
        eq(complianceAlerts.severity, "critical")
      )),
  ]);

  const sales = Number(monthlySales[0]?.total ?? 0);
  const orders = Number(monthlyOrders[0]?.count ?? 0);
  const lowStockCount = Number(lowStock[0]?.count ?? 0);
  const criticalAlerts = Number(failedEtims[0]?.count ?? 0);

  if (orders === 0 && sales === 0) {
    insights.push({
      type: "no_sales",
      title: "No sales this month",
      description: "Start processing transactions to see POS analytics.",
      priority: "normal",
      data: {},
    });
  } else {
    insights.push({
      type: "monthly_sales",
      title: `KES ${sales.toLocaleString()} in sales this month`,
      description: `${orders} orders completed with an average of KES ${orders > 0 ? Math.round(sales / orders).toLocaleString() : 0} per order.`,
      priority: "normal",
      data: { sales, orders, avgOrder: orders > 0 ? sales / orders : 0 },
    });
  }

  if (lowStockCount > 0) {
    insights.push({
      type: "low_stock",
      title: `${lowStockCount} products are below reorder point`,
      description: "Consider restocking these items to avoid stockouts at the POS.",
      priority: "high",
      data: { count: lowStockCount },
    });
  }

  if (criticalAlerts > 0) {
    insights.push({
      type: "compliance_alert",
      title: `${criticalAlerts} critical compliance alerts`,
      description: "Review compliance alerts to ensure eTIMS and tax filings are up to date.",
      priority: "urgent",
      data: { count: criticalAlerts },
    });
  }

  return insights;
}
