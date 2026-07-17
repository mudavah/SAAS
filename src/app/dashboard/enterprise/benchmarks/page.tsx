"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Trophy } from "lucide-react";

export default function BranchBenchmarkingPage() {
  const [data, setData] = useState<{ branches: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/enterprise/reports/benchmarks")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const branches = data?.branches ?? [];
  const best = [...branches].sort((a, b) => b.profit - a.profit)[0];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Branch Benchmarking</h1>
          <p className="text-muted-foreground mt-1">
            Compare branch performance and identify top performers.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : branches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No branch performance data yet. Snapshots are computed by the analytics job.
            </CardContent>
          </Card>
        ) : (
          <>
            {best && (
              <Card className="border-kazi-green/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Trophy className="h-4 w-4 text-kazi-green" /> Top Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{best.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {best.revenueShare}% of org revenue · Profit {best.profit?.toLocaleString() ?? 0}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-kazi-blue" /> Branch Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2">Branch</th>
                        <th className="text-right">Revenue</th>
                        <th className="text-right">Expenses</th>
                        <th className="text-right">Profit</th>
                        <th className="text-right">Revenue Share</th>
                        <th className="text-right">Employees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b) => (
                        <tr key={b.id} className="border-b">
                          <td className="py-2 font-medium">{b.name}</td>
                          <td className="text-right">{(b.revenue ?? 0).toLocaleString()}</td>
                          <td className="text-right">{(b.expenses ?? 0).toLocaleString()}</td>
                          <td className="text-right">{(b.profit ?? 0).toLocaleString()}</td>
                          <td className="text-right">{b.revenueShare ?? 0}%</td>
                          <td className="text-right">{b.employeeCount ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
