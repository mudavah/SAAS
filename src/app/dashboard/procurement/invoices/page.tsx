"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Receipt } from "lucide-react";
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

interface Invoice {
  id: string; invoiceNumber: string; status: string; total: string;
  supplier: { name: string } | null; dueDate: string; amountPaid: string;
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  received: { label: "Received", variant: "default" },
  partially_paid: { label: "Partial", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [post, setPost] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/invoices").then((r) => r.json()),
      fetch("/api/procurement/suppliers").then((r) => r.json()),
    ]).then(([i, s]) => { setInvoices(Array.isArray(i) ? i : []); setSuppliers(Array.isArray(s) ? s : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!supplierId || !invoiceNumber.trim() || !description.trim() || !dueDate) {
      toast({ title: "Supplier, number, item, and due date required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId, invoiceNumber, issueDate, dueDate,
          postToBookkeeping: post,
          items: [{ description, quantity: Number(quantity), unitCost: Number(unitCost) }],
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not save invoice", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Invoice recorded", description: post ? "Posted to bookkeeping" : undefined });
      setOpen(false); setInvoiceNumber(""); setDescription(""); setQuantity("1"); setUnitCost("0"); setDueDate("");
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Purchase Invoices</h1><p className="text-muted-foreground">Record supplier invoices and post to bookkeeping</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> New Invoice</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New Purchase Invoice</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Supplier</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">Select</option>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Invoice #</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
                  <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                </div>
                <div><Label>Item</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Qty</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                  <div><Label>Unit Cost</Label><Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={post} onChange={(e) => setPost(e.target.checked)} /> Post to bookkeeping</label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          invoices.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No invoices yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((inv) => {
              const meta = statusMeta[inv.status] || statusMeta.received;
              return (
                <Card key={inv.id}><CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold truncate">{inv.invoiceNumber}</p><p className="text-xs text-muted-foreground">{inv.supplier?.name || "—"}</p></div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Due {new Date(inv.dueDate).toLocaleDateString()}</span><span className="font-semibold">{formatCurrency(inv.total)}</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Paid {formatCurrency(inv.amountPaid)}</p>
                </CardContent></Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
