"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, CreditCard } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

interface Payment {
  id: string; paymentNumber: string; status: string; amount: string;
  method: string; supplier: { name: string } | null; paymentDate: string;
}

const methodMeta: Record<string, string> = { mpesa: "M-Pesa", stripe: "Stripe", cash: "Cash", bank_transfer: "Bank", other: "Other" };

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/payments").then((r) => r.json()),
      fetch("/api/procurement/suppliers").then((r) => r.json()),
      fetch("/api/procurement/invoices").then((r) => r.json()),
    ]).then(([p, s, i]) => { setPayments(Array.isArray(p) ? p : []); setSuppliers(Array.isArray(s) ? s : []); setInvoices(Array.isArray(i) ? i : []); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!supplierId || !amount || Number(amount) <= 0) { toast({ title: "Supplier and amount required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId, purchaseInvoiceId: purchaseInvoiceId || undefined,
          amount: Number(amount), method, paymentDate, reference,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not record payment", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Payment recorded", description: "Supplier balance updated" });
      setOpen(false); setAmount(""); setReference(""); setPurchaseInvoiceId("");
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Supplier Payments</h1><p className="text-muted-foreground">Pay suppliers and settle balances</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> New Payment</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New Supplier Payment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Supplier</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">Select</option>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select></div>
                <div><Label>Invoice (optional)</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)}>
                    <option value="">— None —</option>{invoices.filter((i: any) => i.supplierId === supplierId).map((i: any) => (<option key={i.id} value={i.id}>{i.invoiceNumber}</option>))}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <div><Label>Method</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                      {Object.entries(methodMeta).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
                  <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          payments.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No payments yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payments.map((p) => (
              <Card key={p.id}><CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold truncate">{p.paymentNumber}</p><p className="text-xs text-muted-foreground">{p.supplier?.name || "—"}</p></div>
                  <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">{methodMeta[p.method] || p.method} · {new Date(p.paymentDate).toLocaleDateString()}</span><span className="font-semibold">{formatCurrency(p.amount)}</span></div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
