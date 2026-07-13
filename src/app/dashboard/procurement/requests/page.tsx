"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
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

interface RequestItem {
  description: string;
  quantity: string;
  unit: string;
  estUnitCost: string;
}

interface PurchaseRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  priority: string;
  totalEstimated: string;
  createdAt: string;
}

const statusMeta: Record<string, { label: string; variant: any; icon: any }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  pending_approval: { label: "Pending", variant: "default", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  ordered: { label: "Ordered", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
};

export default function PurchaseRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState("medium");
  const [neededBy, setNeededBy] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<RequestItem[]>([
    { description: "", quantity: "1", unit: "pcs", estUnitCost: "0" },
  ]);

  function load() {
    setLoading(true);
    fetch("/api/procurement/requests")
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(idx: number, key: keyof RequestItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: "1", unit: "pcs", estUnitCost: "0" },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function reset() {
    setTitle("");
    setDepartment("");
    setPriority("medium");
    setNeededBy("");
    setNotes("");
    setItems([{ description: "", quantity: "1", unit: "pcs", estUnitCost: "0" }]);
  }

  async function submit() {
    const validItems = items.filter((i) => i.description.trim());
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (validItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/procurement/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          department,
          priority,
          neededBy: neededBy || undefined,
          notes,
          items: validItems.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unit: i.unit,
            estUnitCost: Number(i.estUnitCost),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not create request", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Purchase request created" });
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
            <h1 className="text-2xl font-bold">Purchase Requests</h1>
            <p className="text-muted-foreground">Raise and track internal purchase requests</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="kazi">
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto bg-background border rounded-xl p-6">
              <DialogHeader>
                <DialogTitle>New Purchase Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office supplies Q3" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Department</Label>
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Needed By</Label>
                  <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
                </div>
                <div>
                  <Label>Items</Label>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <Input
                          className="flex-1"
                          placeholder="Description"
                          value={it.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                        />
                        <Input
                          className="w-16"
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                        <Input
                          className="w-16"
                          value={it.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        />
                        <Input
                          className="w-24"
                          type="number"
                          value={it.estUnitCost}
                          onChange={(e) => updateItem(idx, "estUnitCost", e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                        >
                          x
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-1 h-3 w-3" /> Add item
                    </Button>
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
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <p className="text-muted-foreground mb-4">No purchase requests yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((r) => {
              const meta = statusMeta[r.status] || statusMeta.draft;
              return (
                <Card key={r.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.requestNumber}</p>
                      </div>
                      <Badge variant={meta.variant}>
                        <meta.icon className="mr-1 h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{r.priority} priority</span>
                      <span className="font-semibold">{formatCurrency(r.totalEstimated)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/dashboard/procurement/requests/${r.id}`} className="flex-1">
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
