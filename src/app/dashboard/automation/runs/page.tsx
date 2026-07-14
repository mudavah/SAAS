"use client";

import { useEffect, useState } from "react";
import { Loader2, GitBranch } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RunLog { actionType: string; order: number; status: string; error?: string }
interface Run { id: string; workflowId: string; status: string; triggerType: string; startedAt: string; finishedAt: string | null; actionsTotal: number; actionsSucceeded: number; actionsFailed: number; logs: RunLog[] }

export default function AutomationRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/automation/runs")
      .then((r) => r.json())
      .then((d) => setRuns(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-kazi-orange" /> Automation Runs</h1>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : runs.length === 0 ? (
          <p className="text-muted-foreground">No runs yet. Trigger a workflow to see its execution history here.</p>
        ) : (
          <div className="grid gap-3">
            {runs.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                      <Badge variant="outline">{r.triggerType}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.actionsSucceeded}/{r.actionsTotal} ok{r.actionsFailed ? ` · ${r.actionsFailed} failed` : ""}</span>
                  </div>
                  <div className="space-y-1">
                    {r.logs.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant={l.status === "success" ? "default" : l.status === "failed" ? "destructive" : "outline"} className="capitalize">{l.status}</Badge>
                        <span className="text-muted-foreground">{l.actionType}</span>
                        {l.error && <span className="text-destructive">— {l.error}</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
