"use client";

import { useEffect, useState } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Report {
  spendBySupplier: { name: string; total: number; invoiceCount: number }[];
  spendByCategory: { category: string | null; total: number }[];
  poStatusBreakdown: { status: string; count: number }[];
  budgetUtilization: { name: string; amount: number; spent: number; utilisationPct: number }[];
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/procurement/reports")
      .then((r) => r.json())
      .then((d) => (d.error ? toast({ title: "Could not load reports", description: d.error, variant: "destructive" }) : setData(d)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (<DashboardShell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardShell>);
  if (!data) return (<DashboardShell><div className="text-center py-16"><p className="text-muted-foreground">No report data</p></div></DashboardShell>);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Procurement Reports</h1>
          <p className="text-muted-foreground">Spend analysis and status breakdowns</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Spend by Supplier</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.spendBySupplier.length === 0 ? <p className="text-sm text-muted-foreground">No spend yet</p> :
                data.spendBySupplier.map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                    <div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.invoiceCount} invoices</p></div>
                    <span className="font-semibold">{formatCurrency(s.total)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Spend by Category</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.spendByCategory.length === 0 ? <p className="text-sm text-muted-foreground">No spend yet</p> :
                data.spendByCategory.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                    <span className="font-medium">{c.category || "Uncategorized"}</span>
                    <span className="font-semibold">{formatCurrency(c.total)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>PO Status Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.poStatusBreakdown.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet</p> :
                data.poStatusBreakdown.map((p) => (
                  <div key={p.status} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                    <span className="capitalize font-medium">{p.status.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{p.count}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Budget Utilization</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.budgetUtilization.length === 0 ? <p className="text-sm text-muted-foreground">No budgets yet</p> :
                data.budgetUtilization.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{b.name}</span><span className="text-muted-foreground">{b.utilisationPct}%</span></div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted"><div className={`h-2 rounded-full ${b.utilisationPct > 100 ? "bg-destructive" : "bg-kazi-green"}`} style={{ width: `${Math.min(100, b.utilisationPct)}%` }} /></div>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(b.spent)} / {formatCurrency(b.amount)}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
