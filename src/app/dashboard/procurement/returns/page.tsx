"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Undo2 } from "lucide-react";
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

interface Ret {
  id: string; returnNumber: string; status: string; total: string;
  supplier: { name: string } | null; returnDate: string; reason: string | null;
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const [returns, setReturns] = useState<Ret[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: "1", unitCost: "0" }]);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/returns").then((r) => r.json()),
      fetch("/api/procurement/suppliers").then((r) => r.json()),
    ]).then(([r, s]) => { setReturns(Array.isArray(r) ? r : []); setSuppliers(Array.isArray(s) ? s : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  function updateItem(idx: number, key: string, value: string) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }
  function addItem() { setItems((p) => [...p, { description: "", quantity: "1", unitCost: "0" }]); }
  function removeItem(idx: number) { setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p)); }

  async function submit() {
    const valid = items.filter((i) => i.description.trim() && Number(i.quantity) > 0);
    if (!supplierId || valid.length === 0) { toast({ title: "Supplier and items required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId, returnDate, reason,
          items: valid.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitCost: Number(i.unitCost) })),
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not create return", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Supplier return created" });
      setOpen(false); setReason(""); setItems([{ description: "", quantity: "1", unitCost: "0" }]);
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Supplier Returns</h1><p className="text-muted-foreground">Return defective or excess goods to suppliers</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> New Return</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New Supplier Return</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Supplier</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">Select</option>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select></div>
                <div><Label>Return Date</Label><Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></div>
                <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                <div><Label>Items</Label>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <Input className="flex-1" placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                        <Input className="w-16" type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                        <Input className="w-20" type="number" value={it.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length === 1}>x</Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add</Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          returns.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No returns yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {returns.map((r) => (
              <Card key={r.id}><CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold truncate">{r.returnNumber}</p><p className="text-xs text-muted-foreground">{r.supplier?.name || "—"}</p></div>
                  <Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{new Date(r.returnDate).toLocaleDateString()}</p>
                <p className="text-sm font-semibold mt-1">{formatCurrency(r.total)}</p>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
