"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  RefreshCw,
  Gauge,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { HealthBadge } from "@/components/dashboard/integrations/HealthIndicator";
import {
  CATEGORY_META,
  HEALTH_COLORS,
  type IntegrationHealth,
  type IntegrationHealthStatus,
} from "@/components/dashboard/integrations/types";

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function IntegrationHealthPage() {
  const [items, setItems] = useState<IntegrationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/health");
      const data = await res.json().catch(() => ({ data: [] }));
      setItems(data?.data ?? []);
      setLastChecked(new Date().toISOString());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runChecks = async () => {
    setChecking(true);
    try {
      await fetch("/api/integrations/health", { method: "POST" }).catch(() => {});
      await load();
    } finally {
      setChecking(false);
    }
  };

  const counts = {
    healthy: items.filter((i) => i.healthStatus === "healthy").length,
    degraded: items.filter((i) => i.healthStatus === "degraded").length,
    down: items.filter((i) => i.healthStatus === "down").length,
    unknown: items.filter((i) => i.healthStatus === "unknown").length,
  };

  const summary: {
    key: IntegrationHealthStatus;
    count: number;
    icon: typeof CheckCircle2;
  }[] = [
    { key: "healthy", count: counts.healthy, icon: CheckCircle2 },
    { key: "degraded", count: counts.degraded, icon: AlertTriangle },
    { key: "down", count: counts.down, icon: XCircle },
    { key: "unknown", count: counts.unknown, icon: HelpCircle },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Integration Health
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time status, latency and sync health for your connections.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastChecked && (
              <span className="text-xs text-muted-foreground">
                Updated {formatTime(lastChecked)}
              </span>
            )}
            <Button variant="kazi" onClick={runChecks} disabled={checking}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`}
              />
              {checking ? "Running…" : "Run Check"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {HEALTH_COLORS[s.key].label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s.count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Checking integration health…
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No connected integrations to monitor.</p>
              <Link
                href="/dashboard/integrations/marketplace"
                className="inline-block mt-3"
              >
                <Button variant="outline" size="sm">
                  Browse Marketplace
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Connections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {items.map((item) => {
                  const meta = CATEGORY_META[item.category];
                  const Icon = meta?.icon;
                  return (
                    <Link
                      key={item.id}
                      href={`/dashboard/integrations/${item.id}`}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-kazi-green/10 text-kazi-green shrink-0">
                          {Icon && <Icon className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.provider}
                            {item.errorMessage ? ` · ${item.errorMessage}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Gauge className="h-4 w-4" />
                          {typeof item.latencyMs === "number"
                            ? `${item.latencyMs} ms`
                            : "—"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {formatTime(item.lastSyncAt)}
                        </span>
                        {typeof item.uptime === "number" && (
                          <span className="hidden sm:inline">
                            {item.uptime}% uptime
                          </span>
                        )}
                        <HealthBadge status={item.healthStatus} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
