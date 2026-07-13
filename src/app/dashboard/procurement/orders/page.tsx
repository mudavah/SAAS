"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, ShoppingCart, Send, CheckCircle2, XCircle, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface PoItem {
  description: string;
  productId: string;
  quantity: string;
  unit: string;
  unitCost: string;
  taxRate: string;
  warehouseId: string;
}
interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  total: string;
  supplier: { name: string } | null;
  createdAt: string;
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  draft: { label: "Draft", variant: "secondary" },
  submitted: { label: "Submitted", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  ordered: { label: "Ordered", variant: "default" },
  partially_received: { label: "Partial", variant: "default" },
  received: { label: "Received", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PoItem[]>([
    { description: "", productId: "", quantity: "1", unit: "pcs", unitCost: "0", taxRate: "16", warehouseId: "" },
  ]);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/procurement/orders").then((r) => r.json()),
      fetch("/api/procurement/suppliers").then((r) => r.json()),
      fetch("/api/inventory/products").then((r) => r.json()),
      fetch("/api/inventory/warehouses").then((r) => r.json()),
    ]).then(([o, s, p, w]) => {
      setOrders(Array.isArray(o) ? o : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setProducts(Array.isArray(p) ? p : []);
      setWarehouses(Array.isArray(w) ? w : []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(idx: number, key: keyof PoItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", productId: "", quantity: "1", unit: "pcs", unitCost: "0", taxRate: "16", warehouseId: "" },
    ]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }
  function reset() {
    setSupplierId("");
    setRequestId("");
    setNotes("");
    setItems([{ description: "", productId: "", quantity: "1", unit: "pcs", unitCost: "0", taxRate: "16", warehouseId: "" }]);
  }

  async function submit() {
    const validItems = items.filter((i) => i.description.trim() && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          requestId: requestId || undefined,
          notes,
          items: validItems.map((i) => ({
            description: i.description,
            productId: i.productId || undefined,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitCost: Number(i.unitCost),
            taxRate: Number(i.taxRate),
            warehouseId: i.warehouseId || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not create PO", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Purchase order created" });
      setOpen(false);
      reset();
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground">Create and track purchase orders</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="kazi">
                <Plus className="mr-2 h-4 w-4" /> New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-background border rounded-xl p-6">
              <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Supplier</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                      <option value="">— None —</option>
                      {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <Label>From Request (optional)</Label>
                    <Input value={requestId} onChange={(e) => setRequestId(e.target.value)} placeholder="Request ID" />
                  </div>
                </div>
                <div>
                  <Label>Items</Label>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <select className="col-span-4 h-10 rounded-md border border-input bg-background px-2 text-sm" value={it.productId} onChange={(e) => {
                          const p = products.find((x) => x.id === e.target.value);
                          updateItem(idx, "productId", e.target.value);
                          if (p) updateItem(idx, "description", p.name);
                        }}>
                          <option value="">Custom item</option>
                          {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                        <Input className="col-span-3" placeholder="Desc" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                        <Input className="col-span-2" type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                        <Input className="col-span-3" type="number" value={it.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} />
                        <Button variant="ghost" size="icon" className="col-span-12 justify-self-end" onClick={() => removeItem(idx)} disabled={items.length === 1}>x</Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add item</Button>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="kazi" onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No purchase orders yet</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((o) => {
              const meta = statusMeta[o.status] || statusMeta.draft;
              return (
                <Card key={o.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{o.poNumber}</p>
                        <p className="text-xs text-muted-foreground">{o.supplier?.name || "No supplier"}</p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
                      <span className="font-semibold">{formatCurrency(o.total)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/dashboard/procurement/orders/${o.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
