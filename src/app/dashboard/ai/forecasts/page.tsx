"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface SeriesPoint { period: string; value: number }
interface ForecastResult {
  id?: string;
  type: string;
  series?: SeriesPoint[];
  items?: {
    productId: string;
    name: string;
    onHand: number;
    avgDailySales: number;
    daysOfStock: number | null;
    reorderSuggested: boolean;
    suggestedReorderQty: number;
  }[];
  confidence: number;
  summary: string;
  model?: string;
}

const TYPES = [
  { value: "revenue", label: "Revenue Forecast" },
  { value: "cash_flow", label: "Cash Flow Forecast" },
  { value: "inventory", label: "Inventory & Reorder" },
] as const;

function fmt(n: number) {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(n);
}

export default function AiForecastsPage() {
  const { toast } = useToast();
  const [type, setType] = useState("revenue");
  const [horizon, setHorizon] = useState("6");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    const r = await fetch("/api/ai/forecasts").then((x) => x.json());
    setHistory(r.data || []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/forecasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, horizon: Number(horizon) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setResult(data.data);
      loadHistory();
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-kazi-orange" /> AI Forecasts
          </h1>
          <p className="text-muted-foreground">Revenue, cash flow and inventory forecasting powered by your business data.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate a forecast</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {type !== "inventory" && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Horizon (months)</label>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 6, 9, 12].map((h) => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="capitalize">{result.type.replace("_", " ")} forecast</span>
                <Badge variant="secondary">Confidence {result.confidence}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              {result.series && result.series.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {result.series.map((p) => (
                    <div key={p.period} className="rounded-md border p-2 text-center">
                      <div className="text-xs text-muted-foreground">{p.period}</div>
                      <div className="font-semibold">{fmt(p.value)}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.items && result.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2">Product</th>
                        <th>On hand</th>
                        <th>Daily sales</th>
                        <th>Days of stock</th>
                        <th>Reorder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((it) => (
                        <tr key={it.productId} className="border-b">
                          <td className="py-2">{it.name}</td>
                          <td>{it.onHand}</td>
                          <td>{it.avgDailySales}</td>
                          <td>{it.daysOfStock ?? "—"}</td>
                          <td>
                            {it.reorderSuggested ? (
                              <Badge variant="destructive">Order {it.suggestedReorderQty}</Badge>
                            ) : (
                              <Badge variant="outline">OK</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-2">Recent forecasts</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No forecasts generated yet.</p>
          ) : (
            <div className="grid gap-2">
              {history.map((h) => (
                <Card key={h.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <span className="capitalize font-medium">{String(h.type).replace("_", " ")}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(h.createdAt).toLocaleString()}</span>
                      <p className="text-sm text-muted-foreground">{h.summary}</p>
                    </div>
                    {h.confidence != null && <Badge variant="secondary">{h.confidence}%</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
