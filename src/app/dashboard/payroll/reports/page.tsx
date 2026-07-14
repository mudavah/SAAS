"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface ReportSummary {
  totalRuns: number;
  approvedRuns: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployees: number;
}

interface MonthlyTrend {
  period: string;
  gross: number;
  net: number;
  employees: number;
}

interface TopEarner {
  employeeId: string;
  name: string;
  employeeNumber: string;
  netPay: number;
}

interface PayrollReport {
  summary: ReportSummary;
  monthlyTrend: MonthlyTrend[];
  topEarners: TopEarner[];
}

export default function PayrollReportsPage() {
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/payroll/reports");
        const data = await res.json();
        if (data.summary) setReport(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-8 text-center text-muted-foreground">Loading reports...</div>
      </DashboardShell>
    );
  }

  if (!report) {
    return (
      <DashboardShell>
        <div className="py-8 text-center text-muted-foreground">No report data available.</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payroll Reports</h1>
          <p className="text-muted-foreground mt-1">Payroll analytics and insights</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
              <BarChart3 className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.summary.totalRuns}</div>
              <p className="text-xs text-muted-foreground">{report.summary.approvedRuns} approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross</CardTitle>
              <TrendingUp className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(report.summary.totalGross)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
              <Wallet className="h-4 w-4 text-kazi-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(report.summary.totalDeductions)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net</CardTitle>
              <Wallet className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(report.summary.totalNet)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {report.monthlyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No trend data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-3 font-medium">Period</th>
                      <th className="pb-3 font-medium text-right">Gross</th>
                      <th className="pb-3 font-medium text-right">Net</th>
                      <th className="pb-3 font-medium text-right">Employees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.monthlyTrend.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 font-medium">{row.period}</td>
                        <td className="py-3 text-right">{formatCurrency(row.gross)}</td>
                        <td className="py-3 text-right">{formatCurrency(row.net)}</td>
                        <td className="py-3 text-right">{row.employees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-kazi-green" />
              Top Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.topEarners.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No top earners data available.</p>
            ) : (
              <div className="space-y-3">
                {report.topEarners.map((earner, idx) => (
                  <div key={earner.employeeId} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{earner.name}</p>
                        <p className="text-xs text-muted-foreground">{earner.employeeNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(earner.netPay)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
