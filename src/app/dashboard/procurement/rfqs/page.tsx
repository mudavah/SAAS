"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, FileText, Send } from "lucide-react";
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

interface Rfq {
  id: string; rfqNumber: string; title: string; status: string;
  validUntil: string | null; _count?: { suppliers: number };
  suppliers?: any[];
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function RfqsPage() {
  const { toast } = useToast();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/rfqs").then((r) => r.json()),
      fetch("/api/procurement/suppliers").then((r) => r.json()),
    ]).then(([r, s]) => {
      setRfqs(Array.isArray(r) ? r : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }
  useEffect(() => { load(); }, []);

  function toggleSupplier(id: string) {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function submit() {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (selected.length === 0) { toast({ title: "Select at least one supplier", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, notes, validUntil: validUntil || undefined,
          supplierIds: selected,
          items: itemDesc.trim() ? [{ description: itemDesc, quantity: Number(itemQty) }] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Could not create RFQ", description: data.error, variant: "destructive" }); return; }
      toast({ title: "RFQ created" });
      setOpen(false); setTitle(""); setNotes(""); setValidUntil(""); setSelected([]); setItemDesc(""); setItemQty("1");
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">RFQs</h1>
            <p className="text-muted-foreground">Request for quotations from suppliers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> New RFQ</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New RFQ</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>Valid Until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
                <div className="grid grid-cols-12 gap-2">
                  <Input className="col-span-9" placeholder="Item description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
                  <Input className="col-span-3" type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
                </div>
                <div><Label>Suppliers</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                    {suppliers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm py-1">
                        <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSupplier(s.id)} />
                        {s.name}
                      </label>
                    ))}
                    {suppliers.length === 0 && <p className="text-sm text-muted-foreground">No suppliers yet</p>}
                  </div>
                </div>
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
          rfqs.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No RFQs yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rfqs.map((r) => {
              const meta = statusMeta[r.status] || statusMeta.draft;
              return (
                <Card key={r.id}><CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold truncate">{r.title}</p><p className="text-xs text-muted-foreground">{r.rfqNumber}</p></div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{r.suppliers?.length ?? r._count?.suppliers ?? 0} suppliers</p>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/dashboard/procurement/rfqs/${r.id}`} className="flex-1"><Button variant="outline" size="sm" className="w-full">View</Button></Link>
                    <Link href={`/dashboard/procurement/quotations?rfq=${r.id}`} className="flex-1"><Button variant="ghost" size="sm" className="w-full">Quotes</Button></Link>
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
