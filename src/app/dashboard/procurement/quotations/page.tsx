"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, FileText, CheckCircle2, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface Quotation {
  id: string; quotationNumber: string; status: string; total: string;
  supplier: { name: string } | null; rfqId: string | null; receivedDate: string;
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  received: { label: "Received", variant: "default" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
};

export default function QuotationsPage() {
  const sp = useSearchParams();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rfqId, setRfqId] = useState(sp.get("rfq") || "");
  const [supplierId, setSupplierId] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/quotations").then((r) => r.json()),
      fetch("/api/procurement/suppliers").then((r) => r.json()),
      fetch("/api/procurement/rfqs").then((r) => r.json()),
    ]).then(([q, s, r]) => {
      setQuotes(Array.isArray(q) ? q : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setRfqs(Array.isArray(r) ? r : []);
      setLoading(false);
    });
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!supplierId || !quotationNumber.trim() || !description.trim()) {
      toast({ title: "Supplier, number, and item required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfqId: rfqId || undefined, supplierId, quotationNumber,
          receivedDate, items: [{ description, quantity: Number(quantity), unitPrice: Number(unitPrice) }],
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not save quotation", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Quotation recorded" }); setOpen(false);
      setQuotationNumber(""); setDescription(""); setQuantity("1"); setUnitPrice("0");
      load();
    } finally { setSaving(false); }
  }

  async function decide(id: string, decision: "accept" | "reject") {
    const res = await fetch(`/api/procurement/quotations/${id}/${decision}`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) { toast({ title: `Could not ${decision}`, description: d.error, variant: "destructive" }); return; }
    toast({ title: `Quotation ${decision}ed` }); load();
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Supplier Quotations</h1><p className="text-muted-foreground">Compare and accept supplier quotes</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> Record Quotation</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>Record Quotation</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>RFQ (optional)</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={rfqId} onChange={(e) => setRfqId(e.target.value)}>
                    <option value="">— None —</option>{rfqs.map((r: any) => (<option key={r.id} value={r.id}>{r.rfqNumber}</option>))}
                  </select></div>
                <div><Label>Supplier</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">Select</option>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quotation #</Label><Input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} /></div>
                  <div><Label>Received</Label><Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} /></div>
                </div>
                <div><Label>Item Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Qty</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                  <div><Label>Unit Price</Label><Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          quotes.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No quotations yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map((q) => {
              const meta = statusMeta[q.status] || statusMeta.received;
              return (
                <Card key={q.id}><CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold truncate">{q.quotationNumber}</p><p className="text-xs text-muted-foreground">{q.supplier?.name || "—"}</p></div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">{new Date(q.receivedDate).toLocaleDateString()}</span><span className="font-semibold">{formatCurrency(q.total)}</span></div>
                  {q.status === "received" && (<div className="mt-3 flex gap-2">
                    <Button variant="kazi" size="sm" className="flex-1" onClick={() => decide(q.id, "accept")}><CheckCircle2 className="mr-1 h-3 w-3" /> Accept</Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => decide(q.id, "reject")}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                  </div>)}
                </CardContent></Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
