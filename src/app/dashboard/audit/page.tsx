"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSearch, Filter } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { name: string | null; email: string };
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("resourceType", filterType);
    if (filterAction) params.set("action", filterAction);
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      return;
    }
    if (data.logs) setLogs(data.logs);
    setLoading(false);
  }, [filterType, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionColors: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    update: "bg-blue-100 text-blue-800",
    delete: "bg-red-100 text-red-800",
    login: "bg-gray-100 text-gray-800",
    role_updated: "bg-purple-100 text-purple-800",
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">Track all important actions in your organization</p>
          </div>
          <Button onClick={fetchLogs} variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All resource types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <FileSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Timestamp</th>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Action</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Resource</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{log.user?.name || "System"}</p>
                          <p className="text-xs text-muted-foreground">{log.user?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className={`capitalize ${actionColors[log.action.split(".")[0]] || "bg-gray-100"}`}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="capitalize">{log.resourceType}</span>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">
                        {log.resourceId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
