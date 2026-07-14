"use client";

import { useEffect, useState } from "react";
import { Loader2, Lightbulb, RefreshCw, AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Insight { id: string; type: string; title: string; description: string; priority: string; createdAt: string }
interface Churn { customerName: string | null; risk: string; score: number; factors: string[]; recommendedAction: string | null }

function priorityVariant(p: string): "default" | "secondary" | "destructive" | "outline" {
  if (p === "urgent" || p === "high") return "destructive";
  if (p === "normal") return "default";
  return "secondary";
}
function riskVariant(r: string): "default" | "secondary" | "destructive" | "outline" {
  if (r === "high") return "destructive";
  if (r === "medium") return "secondary";
  return "outline";
}

export default function AiInsightsPage() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [churn, setChurn] = useState<Churn[]>([]);
  const [churnNarrative, setChurnNarrative] = useState("");
  const [loading, setLoading] = useState(true);
  const [genInsights, setGenInsights] = useState(false);
  const [genChurn, setGenChurn] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([
        fetch("/api/ai/insights").then((r) => r.json()),
        fetch("/api/ai/churn").then((r) => r.json()),
      ]);
      setInsights(i.data || []);
      setChurn(c.data?.predictions || []);
      setChurnNarrative(c.data?.narrative || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function generateInsights() {
    setGenInsights(true);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setInsights(data.data || []);
      toast({ title: "Insights refreshed", description: `${data.data?.length ?? 0} insights generated.` });
    } finally {
      setGenInsights(false);
    }
  }

  async function refreshChurn() {
    setGenChurn(true);
    try {
      const res = await fetch("/api/ai/churn?regenerate=true").then((r) => r.json());
      setChurn(res.data?.predictions || []);
      setChurnNarrative(res.data?.narrative || "");
    } finally {
      setGenChurn(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-kazi-orange" /> AI Business Insights
          </h1>
          <p className="text-muted-foreground">Automatic insights and churn-risk predictions across your business.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Insights</CardTitle>
                <Button size="sm" onClick={generateInsights} disabled={genInsights}>
                  {genInsights ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No insights yet. Click refresh to generate.</p>
                ) : (
                  insights.map((i) => (
                    <div key={i.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{i.title}</span>
                        <Badge variant={priorityVariant(i.priority)} className="capitalize">{i.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{i.description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-kazi-orange" /> Customer Churn Risk
                </CardTitle>
                <Button size="sm" variant="outline" onClick={refreshChurn} disabled={genChurn}>
                  {genChurn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Recalculate
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {churnNarrative && <p className="text-sm text-muted-foreground">{churnNarrative}</p>}
                {churn.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No churn predictions available.</p>
                ) : (
                  <div className="space-y-2">
                    {churn.map((c, idx) => (
                      <div key={idx} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.customerName || "Unknown customer"}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">score {c.score}</span>
                            <Badge variant={riskVariant(c.risk)} className="capitalize">{c.risk} risk</Badge>
                          </div>
                        </div>
                        {c.factors?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">{c.factors.join(" · ")}</p>
                        )}
                        {c.recommendedAction && (
                          <p className="text-sm mt-1"><span className="font-medium">Action:</span> {c.recommendedAction}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
