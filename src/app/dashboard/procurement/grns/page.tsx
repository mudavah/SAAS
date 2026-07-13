"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Grn {
  id: string; grnNumber: string; status: string; receivedDate: string;
  purchaseOrder: { poNumber: string } | null; supplier: { name: string } | null;
}
interface PoItem { id: string; description: string; quantity: string; unit: string; receivedQuantity: string; warehouseId: string | null; }

export default function GrnsPage() {
  const { toast } = useToast();
  const [grns, setGrns] = useState<Grn[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poId, setPoId] = useState("");
  const [poItems, setPoItems] = useState<PoItem[]>([]);
  const [received, setReceived] = useState<Record<string, string>>({});
  const [whMap, setWhMap] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/grns").then((r) => r.json()),
      fetch("/api/procurement/orders").then((r) => r.json()),
      fetch("/api/inventory/warehouses").then((r) => r.json()),
    ]).then(([g, o, w]) => {
      setGrns(Array.isArray(g) ? g : []);
      setOrders(Array.isArray(o) ? o : []);
      setWarehouses(Array.isArray(w) ? w : []);
      setLoading(false);
    });
  }
  useEffect(() => { load(); }, []);

  async function pickPo(id: string) {
    setPoId(id);
    const res = await fetch(`/api/procurement/orders/${id}`);
    const po = await res.json();
    if (po?.items) {
      setPoItems(po.items);
      setReceived(Object.fromEntries(po.items.map((it: any) => [it.id, it.quantity])));
      setWhMap(Object.fromEntries(po.items.map((it: any) => [it.id, it.warehouseId || (warehouses[0]?.id ?? "")])));
    }
  }

  async function submit() {
    if (!poId) { toast({ title: "Select a purchase order", variant: "destructive" }); return; }
    const items = poItems.map((it) => ({
      poItemId: it.id,
      warehouseId: whMap[it.id],
      quantityReceived: Number(received[it.id] || 0),
      quantityDamaged: 0,
    })).filter((i) => i.quantityReceived > 0 && i.warehouseId);
    if (items.length === 0) { toast({ title: "Enter received quantities", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/procurement/orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not receive", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Goods received", description: "Inventory updated" });
      setOpen(false); setPoId(""); setPoItems([]); setReceived({}); setWhMap({});
      load();
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Goods Received</h1><p className="text-muted-foreground">Record deliveries and update inventory</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button variant="kazi"><Plus className="mr-2 h-4 w-4" /> Receive Goods</Button></DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>Receive Goods</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Purchase Order</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={poId} onChange={(e) => pickPo(e.target.value)}>
                    <option value="">Select PO</option>
                    {orders.filter((o) => ["approved", "ordered", "partially_received", "received"].includes(o.status)).map((o) => (<option key={o.id} value={o.id}>{o.poNumber} — {o.supplier?.name || "—"}</option>))}
                  </select></div>
                {poItems.length > 0 && (
                  <div className="space-y-3">
                    {poItems.map((it) => (
                      <div key={it.id} className="border rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium">{it.description} <span className="text-muted-foreground">({it.receivedQuantity}/{it.quantity} {it.unit})</span></p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Qty received" value={received[it.id] ?? ""} onChange={(e) => setReceived((p) => ({ ...p, [it.id]: e.target.value }))} />
                          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={whMap[it.id] || ""} onChange={(e) => setWhMap((p) => ({ ...p, [it.id]: e.target.value }))}>
                            <option value="">Warehouse</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Receive</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          grns.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No goods received yet</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grns.map((g) => (
              <Card key={g.id}><CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold truncate">{g.grnNumber}</p><p className="text-xs text-muted-foreground">{g.purchaseOrder?.poNumber || "—"} · {g.supplier?.name || "—"}</p></div>
                  <Badge variant={g.status === "completed" ? "default" : "secondary"}>{g.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{new Date(g.receivedDate).toLocaleDateString()}</p>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
