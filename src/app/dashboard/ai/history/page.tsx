"use client";

import { useEffect, useState } from "react";
import { Loader2, History, FileBarChart, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface HistoryData {
  counts: Record<string, number>;
  recent: {
    forecasts: any[];
    insights: any[];
    reports: any[];
    documents: any[];
    tasks: any[];
    churn: any[];
    queries: any[];
  };
}
interface AiReport { id: string; type: string; title: string; narrative: string | null; createdAt: string }

const REPORT_TYPES = [
  { value: "financial_summary", label: "Financial Summary" },
  { value: "profit_loss", label: "Profit & Loss" },
  { value: "cash_flow", label: "Cash Flow" },
  { value: "tax_readiness", label: "Tax Readiness" },
] as const;

const COUNT_LABELS: Record<string, string> = {
  forecasts: "Forecasts",
  insights: "Insights",
  reports: "Reports",
  documents: "Documents",
  tasks: "Task recs",
  churn: "Churn scans",
  queries: "Questions",
};

export default function AiHistoryPage() {
  const { toast } = useToast();
  const [data, setData] = useState<HistoryData | null>(null);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("financial_summary");
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [h, r] = await Promise.all([
        fetch("/api/ai/history").then((x) => x.json()),
        fetch("/api/ai/reports").then((x) => x.json()),
      ]);
      setData(h.data || null);
      setReports(r.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function generateReport() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reportType }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Report generated" });
      load();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-kazi-orange" /> AI Activity
          </h1>
          <p className="text-muted-foreground">Overview of AI usage and financial reports across your organization.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {data && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {Object.entries(data.counts).map(([k, v]) => (
                  <Card key={k}>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-bold">{v}</div>
                      <div className="text-xs text-muted-foreground">{COUNT_LABELS[k] ?? k}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileBarChart className="h-4 w-4 text-kazi-orange" /> AI Financial Reports
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={generateReport} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Generate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reports generated yet.</p>
                ) : (
                  reports.map((r) => (
                    <div key={r.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.title}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.narrative && <p className="text-sm text-muted-foreground mt-1">{r.narrative}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {data && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Recent insights</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {data.recent.insights.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : data.recent.insights.map((i: any) => (
                      <div key={i.id} className="text-sm flex items-center justify-between">
                        <span>{i.title}</span>
                        <Badge variant="outline" className="capitalize">{i.priority}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Recent questions</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {data.recent.queries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : data.recent.queries.map((q: any) => (
                      <p key={q.id} className="text-sm text-muted-foreground truncate">{q.query}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
