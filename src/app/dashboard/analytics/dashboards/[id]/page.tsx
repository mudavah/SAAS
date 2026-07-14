"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Widget {
  id: string;
  type: "kpi_card" | "line_chart" | "bar_chart" | "pie_chart";
  title: string;
  data?: any;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
}

export default function DashboardViewPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/dashboards/${params.id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setDashboard(json);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, toast]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
        </div>
      </DashboardShell>
    );
  }

  if (!dashboard) {
    return (
      <DashboardShell>
        <p className="text-muted-foreground">Dashboard not found</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/analytics/dashboards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{dashboard.name}</h1>
            <p className="text-muted-foreground mt-1">{dashboard.description}</p>
          </div>
        </div>

        {dashboard.widgets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">This dashboard has no widgets yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.widgets.map((widget) => (
              <Card key={widget.id} className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">{widget.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {widget.type === "kpi_card" && (
                    <div className="text-3xl font-bold">
                      {typeof widget.data?.value === "number"
                        ? formatCurrency(widget.data.value)
                        : widget.data?.value ?? "—"}
                    </div>
                  )}
                  {widget.type === "line_chart" && (
                    <p className="text-sm text-muted-foreground">Line chart widget</p>
                  )}
                  {widget.type === "bar_chart" && (
                    <p className="text-sm text-muted-foreground">Bar chart widget</p>
                  )}
                  {widget.type === "pie_chart" && (
                    <p className="text-sm text-muted-foreground">Pie chart widget</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
