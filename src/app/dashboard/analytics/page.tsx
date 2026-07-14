"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  TrendingUp,
  Package,
  Users,
  BarChart3,
  DollarSign,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { SimpleLineChart, SimpleBarChart } from "@/components/analytics/charts";
import { formatCurrency } from "@/lib/utils";

interface Summary {
  revenue: { total: number; trend: number };
  sales: { total: number; count: number; trend: number };
  inventory: { value: number; lowStock: number };
  crm: { leads: number; winRate: number };
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<any[]>([]);
  const [inventoryValue, setInventoryValue] = useState<any[]>([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [summaryRes, revRes, salesRes, invRes] = await Promise.all([
          fetch("/api/analytics", { cache: "no-store" }),
          fetch("/api/analytics/revenue", { cache: "no-store" }),
          fetch("/api/analytics/sales", { cache: "no-store" }),
          fetch("/api/analytics/inventory", { cache: "no-store" }),
        ]);
        const s = await summaryRes.json();
        const r = await revRes.json();
        const sa = await salesRes.json();
        const i = await invRes.json();

        if (!summaryRes.ok) throw new Error(s.error || "Failed to load summary");
        setSummary(s);
        setRevenueTrend(r.trend || []);
        setSalesByMonth(sa.byMonth || []);
        setInventoryValue(i.byMonth || []);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load analytics",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "sales", label: "Sales" },
    { id: "revenue", label: "Revenue" },
    { id: "inventory", label: "Inventory" },
    { id: "crm", label: "CRM" },
  ];

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: "Total Revenue",
        value: formatCurrency(summary.revenue.total),
        icon: DollarSign,
        color: "text-kazi-green",
        href: "/dashboard/analytics/revenue",
      },
      {
        label: "Total Sales",
        value: formatCurrency(summary.sales.total),
        icon: TrendingUp,
        color: "text-kazi-blue",
        href: "/dashboard/analytics/sales",
      },
      {
        label: "Sales Count",
        value: summary.sales.count.toLocaleString("en-KE"),
        icon: BarChart3,
        color: "text-kazi-orange",
        href: "/dashboard/analytics/sales",
      },
      {
        label: "Inventory Value",
        value: formatCurrency(summary.inventory.value),
        icon: Package,
        color: "text-kazi-purple",
        href: "/dashboard/analytics/inventory",
      },
      {
        label: "CRM Leads",
        value: summary.crm.leads.toLocaleString("en-KE"),
        icon: Users,
        color: "text-kazi-green",
        href: "/dashboard/analytics/crm",
      },
      {
        label: "Win Rate",
        value: `${summary.crm.winRate.toFixed(1)}%`,
        icon: TrendingUp,
        color: "text-kazi-blue",
        href: "/dashboard/analytics/crm",
      },
      {
        label: "Low Stock Items",
        value: summary.inventory.lowStock.toLocaleString("en-KE"),
        icon: Package,
        color: "text-destructive",
        href: "/dashboard/analytics/inventory",
      },
    ];
  }, [summary]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Business intelligence and performance metrics
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "kazi" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.slice(0, 4).map((kpi) => (
                <Link key={kpi.label} href={kpi.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {kpi.label}
                      </CardTitle>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{kpi.value}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueTrend.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No revenue data available
                    </p>
                  ) : (
                    <SimpleLineChart
                      data={revenueTrend}
                      xKey="month"
                      lines={[
                        { key: "revenue", name: "Revenue", color: "#006B3F" },
                        { key: "expenses", name: "Expenses", color: "#EA580C" },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesByMonth.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sales data available
                    </p>
                  ) : (
                    <SimpleBarChart
                      data={salesByMonth}
                      xKey="month"
                      bars={[
                        { key: "sales", name: "Sales", color: "#1E3A8A" },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tab === "sales" && (
          <Link href="/dashboard/analytics/sales">
            <Button variant="kazi">
              View Sales Analytics <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
        {tab === "revenue" && (
          <Link href="/dashboard/analytics/revenue">
            <Button variant="kazi">
              View Revenue Analytics <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
        {tab === "inventory" && (
          <Link href="/dashboard/analytics/inventory">
            <Button variant="kazi">
              View Inventory Analytics <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
        {tab === "crm" && (
          <Link href="/dashboard/analytics/crm">
            <Button variant="kazi">
              View CRM Analytics <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </DashboardShell>
  );
}
