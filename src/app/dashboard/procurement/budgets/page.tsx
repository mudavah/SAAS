"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Budget {
  id: string; name: string; category: string | null; period: string;
  periodStart: string; periodEnd: string; amount: string; spent: string;
}

export default function BudgetsPage() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/procurement/budgets").then((r) => r.json()).then((d) => setBudgets(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!name.trim() || !amount || Number(amount) <= 0 || !periodEnd) {
      toast({ title: "Name, amount, and period end required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, period, periodStart, periodEnd, amount: Number(amount), notes }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not create budget", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Budget created" }); setOpen(false);
      setName(""); setCategory(""); setAmount(""); setPeriodEnd(""); setNotes("");
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Budgets</h1><p className="text-muted-foreground">Control procurement spend by period</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> New Budget</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New Budget</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. IT" /></div>
                  <div><Label>Period</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
                      <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start</Label><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
                  <div><Label>End</Label><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
                </div>
                <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          budgets.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No budgets yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b) => {
              const spent = Number(b.spent); const amt = Number(b.amount);
              const pct = amt > 0 ? Math.min(100, Math.round((spent / amt) * 100)) : 0;
              const over = spent > amt;
              return (
                <Card key={b.id}><CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold truncate">{b.name}</p><p className="text-xs text-muted-foreground capitalize">{b.period} {b.category ? `· ${b.category}` : ""}</p></div>
                    {over && <Badge variant="destructive">Over</Badge>}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Spent</span><span className="font-semibold">{formatCurrency(spent)} / {formatCurrency(amt)}</span></div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted"><div className={`h-2 rounded-full ${over ? "bg-destructive" : "bg-kazi-green"}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                </CardContent></Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
