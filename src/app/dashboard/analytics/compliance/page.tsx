"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { SimplePieChart } from "@/components/analytics/charts";

interface ComplianceData {
  pendingSubmissions: number;
  completedSubmissions: number;
  alerts: { severity: string; count: number }[];
}

export default function ComplianceAnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComplianceData | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/analytics/compliance", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load compliance data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell>
        <p className="text-muted-foreground">No data available</p>
      </DashboardShell>
    );
  }

  const severityVariant = (severity: string) => {
    if (severity === "critical" || severity === "high") return "destructive";
    if (severity === "medium") return "default";
    return "secondary";
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Compliance Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Submissions, alerts, and regulatory status
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.pendingSubmissions.toLocaleString("en-KE")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.completedSubmissions.toLocaleString("en-KE")}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No alerts</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimplePieChart
                  data={data.alerts}
                  dataKey="count"
                  nameKey="severity"
                />
                <div className="space-y-3">
                  {data.alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{alert.severity}</span>
                      <Badge variant={severityVariant(alert.severity)}>{alert.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
