"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, RefreshCw, Check, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Rec {
  id: string; type: string; title: string; description: string;
  priority: string; estimatedCost: string | null; status: string;
  product: { name: string } | null; recommendedSupplier: { name: string } | null;
}

export default function RecommendationsPage() {
  const { toast } = useToast();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/procurement/recommendations").then((r) => r.json()).then((d) => setRecs(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function regenerate() {
    setBusy(true);
    try {
      const res = await fetch("/api/procurement/recommendations", { method: "POST" });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not generate", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Recommendations generated" }); load();
    } finally { setBusy(false); }
  }

  async function setStatus(r: Rec, status: string) {
    const res = await fetch("/api/procurement/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, status }),
    });
    const d = await res.json();
    if (!res.ok) { toast({ title: "Could not update", description: d.error, variant: "destructive" }); return; }
    toast({ title: `Marked ${status}` }); load();
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">AI Recommendations</h1><p className="text-muted-foreground">Smart reorder and supplier suggestions</p></div>
          <Button variant="kazi" onClick={regenerate} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Generate
          </Button>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          recs.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-muted-foreground mb-4">No open recommendations</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.map((r) => (
              <Card key={r.id}><CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2"><Sparkles className="h-4 w-4 text-kazi-blue" />{r.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.type.replace(/_/g, " ")}</p>
                  </div>
                  <Badge variant={r.priority === "high" ? "destructive" : "secondary"}>{r.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{r.description}</p>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">{r.product?.name || "—"}{r.recommendedSupplier ? ` · ${r.recommendedSupplier.name}` : ""}</span>
                  {r.estimatedCost && <span className="font-semibold">{formatCurrency(r.estimatedCost)}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="kazi" size="sm" className="flex-1" onClick={() => setStatus(r, "applied")}><Check className="mr-1 h-3 w-3" /> Apply</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setStatus(r, "dismissed")}><X className="mr-1 h-3 w-3" /> Dismiss</Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
