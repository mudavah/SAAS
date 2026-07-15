"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, History, RefreshCw } from "lucide-react";
import { ActivityLog } from "@/components/dashboard/integrations/ActivityLog";
import type { IntegrationActivityLog } from "@/components/dashboard/integrations/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "error", label: "Error" },
  { value: "pending", label: "Pending" },
];

export default function IntegrationActivityPage() {
  const [logs, setLogs] = useState<IntegrationActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/integrations/activity")
      .then((r) => r.json())
      .then((data) => setLogs(data?.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = status === "all" || log.status === status;
      const matchesQuery =
        !q ||
        log.provider.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.message?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [logs, query, status]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground mt-1">
              Audit trail of integration events and dispatches.
            </p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by provider, action or message…"
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm bg-background"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </div>

        <ActivityLog
          logs={filtered}
          loading={loading}
          emptyMessage="No activity matches your filters."
        />
      </div>
    </DashboardShell>
  );
}
