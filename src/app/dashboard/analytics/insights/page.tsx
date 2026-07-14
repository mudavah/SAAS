"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  read: boolean;
}

export default function InsightsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/analytics/insights", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setInsights(json.insights || json || []);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load insights",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  async function markRead(id: string) {
    try {
      const res = await fetch(`/api/analytics/insights/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    } catch {
      toast({ title: "Error", description: "Failed to mark as read", variant: "destructive" });
    }
  }

  async function dismiss(id: string) {
    try {
      const res = await fetch(`/api/analytics/insights/${id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setInsights((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Insight dismissed" });
    } catch {
      toast({ title: "Error", description: "Failed to dismiss insight", variant: "destructive" });
    }
  }

  const severityIcon = (severity: string) => {
    if (severity === "critical" || severity === "high") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (severity === "medium") return <Info className="h-4 w-4 text-kazi-blue" />;
    return <CheckCircle2 className="h-4 w-4 text-kazi-green" />;
  };

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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-generated business insights and recommendations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No insights available</p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${insight.read ? "bg-muted/30" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {severityIcon(insight.severity)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{insight.title}</h4>
                            <Badge variant={insight.severity === "critical" || insight.severity === "high" ? "destructive" : insight.severity === "medium" ? "default" : "secondary"}>
                              {insight.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!insight.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markRead(insight.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => dismiss(insight.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
