"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AnalyticsData = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgResponseTimeMs: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
};

export default function DeveloperAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStart(thirtyDaysAgo.toISOString().split("T")[0]);
    setEnd(now.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!start || !end) return;
    const params = new URLSearchParams({ start, end });
    fetch(`/api/developer/analytics?${params}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        setAnalytics(data.analytics);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [start, end]);

  const maxCount = analytics?.topEndpoints?.[0]?.count || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">API usage metrics and performance data</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <label className="text-sm font-medium">Start Date</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">End Date</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{analytics.totalRequests.toLocaleString()}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{analytics.successfulRequests.toLocaleString()}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-destructive">{analytics.failedRequests.toLocaleString()}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Error Rate</p>
              <p className="text-2xl font-bold">{analytics.errorRate.toFixed(1)}%</p>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Top Endpoints</h2>
            </div>
            <div className="space-y-3">
              {analytics.topEndpoints.map((ep) => (
                <div key={ep.endpoint} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-40 truncate">{ep.endpoint}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-kazi-green h-full rounded-full"
                      style={{ width: `${(ep.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{ep.count}</span>
                </div>
              ))}
              {analytics.topEndpoints.length === 0 && (
                <p className="text-sm text-muted-foreground">No data for this period.</p>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground">No analytics data available.</p>
      )}
    </div>
  );
}
