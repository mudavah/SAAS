"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Layers,
  PlayCircle,
  FileText,
  BarChart3,
  UserCircle,
  RefreshCw,
  X,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
}

interface ReportSummary {
  totalRuns: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployees: number;
}

export default function PayrollDashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [payslipCount, setPayslipCount] = useState(0);
  const [periodCount, setPeriodCount] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, reportsRes, payslipsRes, periodsRes, runsRes] = await Promise.all([
        fetch("/api/payroll/insights"),
        fetch("/api/payroll/reports"),
        fetch("/api/payroll/payslips"),
        fetch("/api/payroll/periods"),
        fetch("/api/payroll/runs"),
      ]);
      const insightsData = await insightsRes.json();
      const reportsData = await reportsRes.json();
      const payslipsData = await payslipsRes.json();
      const periodsData = await periodsRes.json();
      const runsData = await runsRes.json();

      if (Array.isArray(insightsData)) setInsights(insightsData);
      if (reportsData.summary) setSummary(reportsData.summary);
      if (Array.isArray(payslipsData)) setPayslipCount(payslipsData.length);
      if (Array.isArray(periodsData)) setPeriodCount(periodsData.length);
      if (Array.isArray(runsData)) setRunCount(runsData.length);
    } catch {
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshInsights() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/payroll/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Error", description: data.error ?? "Failed to refresh insights", variant: "destructive" });
        return;
      }
      router.refresh();
      await load();
      toast({ title: "Insights refreshed" });
    } catch {
      toast({ title: "Error", description: "Failed to refresh insights", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }

  async function dismissInsight(id: string) {
    try {
      const res = await fetch(`/api/payroll/insights/${id}/dismiss`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Error", description: data.error ?? "Failed to dismiss", variant: "destructive" });
        return;
      }
      setInsights((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Insight dismissed" });
    } catch {
      toast({ title: "Error", description: "Failed to dismiss insight", variant: "destructive" });
    }
  }

  const priorityBadgeVariant = (priority: string) => {
    if (priority === "high") return "destructive";
    if (priority === "normal") return "default";
    return "secondary";
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Payroll</h1>
            <p className="text-muted-foreground mt-1">
              Manage payroll periods, structures, runs, and payslips
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/payroll/periods">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Payroll Periods</CardTitle>
                <CalendarDays className="h-4 w-4 text-kazi-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{periodCount}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/payroll/structures">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Salary Structures</CardTitle>
                <Layers className="h-4 w-4 text-kazi-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalEmployees ?? 0}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/payroll/runs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Payroll Runs</CardTitle>
                <PlayCircle className="h-4 w-4 text-kazi-orange" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{runCount}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/payroll/payslips">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payslips</CardTitle>
                <FileText className="h-4 w-4 text-kazi-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payslipCount}</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross</CardTitle>
                <TrendingUp className="h-4 w-4 text-kazi-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalGross)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
                <Wallet className="h-4 w-4 text-kazi-orange" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalDeductions)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
                <Wallet className="h-4 w-4 text-kazi-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalNet)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <BarChart3 className="h-4 w-4 text-kazi-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEmployees}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-kazi-blue" />
              Payroll AI Insights
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refreshInsights} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading insights...</div>
            ) : insights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No insights available. Click Refresh to generate.</div>
            ) : (
              <div className="grid gap-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <Badge variant={priorityBadgeVariant(insight.priority)}>{insight.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={() => dismissInsight(insight.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/payroll/periods", label: "Periods", icon: CalendarDays },
            { href: "/dashboard/payroll/structures", label: "Salary Structures", icon: Layers },
            { href: "/dashboard/payroll/runs", label: "Payroll Runs", icon: PlayCircle },
            { href: "/dashboard/payroll/payslips", label: "Payslips", icon: FileText },
            { href: "/dashboard/payroll/reports", label: "Reports", icon: BarChart3 },
            { href: "/dashboard/payroll/portal", label: "My Payslips", icon: UserCircle },
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
