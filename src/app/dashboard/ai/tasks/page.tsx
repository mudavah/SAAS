"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckSquare, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface TaskRec {
  id?: string;
  title: string;
  description: string | null;
  priority: string;
  category: string | null;
  dueDate: string | null;
}

function priorityVariant(p: string): "default" | "secondary" | "destructive" | "outline" {
  if (p === "high") return "destructive";
  if (p === "medium") return "default";
  return "secondary";
}

export default function AiTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskRec[]>([]);
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/tasks").then((x) => x.json());
      setTasks(r.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/tasks", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setTasks(data.data?.recommendations || []);
      setNarrative(data.data?.narrative || "");
      toast({ title: "Recommendations refreshed" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-kazi-orange" /> AI Task Recommendations
            </h1>
            <p className="text-muted-foreground">Prioritized next actions based on your live business data.</p>
          </div>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {narrative && (
          <Card><CardContent className="py-3 text-sm text-muted-foreground">{narrative}</CardContent></Card>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations yet. Click refresh to generate.</p>
        ) : (
          <div className="grid gap-2">
            {tasks.map((t, i) => (
              <Card key={t.id ?? i}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.title}</span>
                    <div className="flex items-center gap-2">
                      {t.category && <Badge variant="outline" className="capitalize">{t.category.replace(/_/g, " ")}</Badge>}
                      <Badge variant={priorityVariant(t.priority)} className="capitalize">{t.priority}</Badge>
                    </div>
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                  {t.dueDate && <span className="text-xs text-muted-foreground">Due {new Date(t.dueDate).toLocaleDateString()}</span>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
