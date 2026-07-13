"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Package, Star } from "lucide-react";
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

interface Supplier {
  id: string; name: string; email: string | null; phone: string | null;
  category: string | null; rating: number | null; isActive: boolean;
  performance?: { totalSpend: number; poCount: number; openBalance: number } | null;
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/procurement/suppliers").then((r) => r.json()).then((d) => setSuppliers(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactName, email, phone, category, paymentTerms, notes }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not create supplier", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Supplier created" }); setOpen(false);
      setName(""); setContactName(""); setEmail(""); setPhone(""); setCategory(""); setPaymentTerms(""); setNotes("");
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Suppliers</h1><p className="text-muted-foreground">Manage vendors and track performance</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> New Supplier</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
                  <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                <div><Label>Payment Terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" /></div>
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
          suppliers.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No suppliers yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <Card key={s.id}><CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2"><Package className="h-4 w-4 text-kazi-green" />{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email || s.phone || "—"}</p>
                  </div>
                  {s.rating != null && (<Badge variant="secondary"><Star className="mr-1 h-3 w-3" />{s.rating}</Badge>)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="font-semibold">{s.performance?.poCount ?? 0}</p><p className="text-xs text-muted-foreground">POs</p></div>
                  <div><p className="font-semibold">{formatCurrency(s.performance?.totalSpend ?? 0)}</p><p className="text-xs text-muted-foreground">Spend</p></div>
                  <div><p className="font-semibold">{formatCurrency(s.performance?.openBalance ?? 0)}</p><p className="text-xs text-muted-foreground">Balance</p></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/dashboard/procurement/suppliers/${s.id}`} className="flex-1"><Button variant="outline" size="sm" className="w-full">View</Button></Link>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
