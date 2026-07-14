"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface QueryResult { query: string; intent: string; answer: string; plan: string[]; model: string }
interface QueryLog { id: string; query: string; intent: string; answer: string; createdAt: string }

const EXAMPLES = [
  "How much revenue did we make this month?",
  "What are my outstanding invoices?",
  "Which products are low on stock?",
  "How many new clients this month?",
];

export default function AiQueryPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryLog[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    const r = await fetch("/api/ai/nl-query").then((x) => x.json());
    setHistory(r.data || []);
  }
  useEffect(() => { loadHistory(); }, []);

  async function ask(q?: string) {
    const question = (q ?? query).trim();
    if (!question) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/nl-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setResult(data.data);
      loadHistory();
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-kazi-orange" /> Ask KaziFlow AI
          </h1>
          <p className="text-muted-foreground">Ask questions about your business in plain language.</p>
        </div>

        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="e.g. How much did we earn last month?"
              />
              <Button onClick={() => ask()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => { setQuery(e); ask(e); }}
                  className="text-xs rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Answer</span>
                <Badge variant="outline" className="capitalize">{result.intent.replace(/_/g, " ")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="whitespace-pre-wrap">{result.answer}</p>
              {result.plan?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">How I worked this out:</span>
                  <ul className="list-disc ml-5 mt-1">
                    {result.plan.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Recent questions</h2>
            <div className="space-y-2">
              {history.map((h) => (
                <Card key={h.id}>
                  <CardContent className="py-3">
                    <p className="text-sm font-medium">{h.query}</p>
                    <p className="text-sm text-muted-foreground mt-1">{h.answer}</p>
                    <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
