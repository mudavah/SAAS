"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, Pencil, BarChart3 } from "lucide-react";
import Link from "next/link";

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: any[];
  createdAt: string;
}

export default function DashboardsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/analytics/dashboards", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setDashboards(json.dashboards || json || []);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load dashboards",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  async function createDashboard() {
    try {
      const name = prompt("Dashboard name:");
      if (!name) return;
      const res = await fetch("/api/analytics/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDashboards((prev) => [...prev, json.dashboard]);
      toast({ title: "Dashboard created" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create dashboard",
        variant: "destructive",
      });
    }
  }

  async function deleteDashboard(id: string) {
    try {
      const res = await fetch(`/api/analytics/dashboards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDashboards((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Dashboard deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete dashboard", variant: "destructive" });
    }
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Custom Dashboards</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your custom analytics dashboards
            </p>
          </div>
          <Button variant="kazi" onClick={createDashboard}>
            <Plus className="mr-2 h-4 w-4" /> New Dashboard
          </Button>
        </div>

        {dashboards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No custom dashboards yet</p>
              <Button variant="kazi" className="mt-4" onClick={createDashboard}>
                <Plus className="mr-2 h-4 w-4" /> Create Your First Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((d) => (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{d.name}</CardTitle>
                  <div className="flex gap-1">
                    <Link href={`/dashboard/analytics/dashboards/${d.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteDashboard(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{d.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {d.widgets?.length || 0} widgets
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
