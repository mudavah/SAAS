"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Send, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Approval { id: string; level: number; requiredRoleType: string; status: string; comments: string | null; }
interface PoItem { id: string; description: string; quantity: string; unit: string; unitCost: string; taxRate: string; lineTotal: string; receivedQuantity: string; }
interface PurchaseOrder {
  id: string; poNumber: string; status: string; total: string; subtotal: string; taxAmount: string;
  supplier: { name: string } | null; notes: string | null; createdAt: string;
  items: PoItem[]; approvals: Approval[];
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  draft: { label: "Draft", variant: "secondary" },
  submitted: { label: "Submitted", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  ordered: { label: "Ordered", variant: "default" },
  partially_received: { label: "Partially Received", variant: "default" },
  received: { label: "Received", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/procurement/orders/${id}`)
      .then((r) => r.json())
      .then((data) => (data.error ? setPo(null) : setPo(data)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function act(action: "submit" | "approve" | "reject" | "order") {
    setBusy(true);
    try {
      const res = await fetch(`/api/procurement/orders/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast({ title: `Could not ${action}`, description: data.error, variant: "destructive" }); return; }
      toast({ title: `Order ${action}ed` });
      load();
    } finally { setBusy(false); }
  }

  if (loading) return (<DashboardShell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardShell>);
  if (!po) return (<DashboardShell><div className="text-center py-16"><p className="text-muted-foreground mb-4">Order not found</p><Link href="/dashboard/procurement/orders"><Button variant="outline">Back to orders</Button></Link></div></DashboardShell>);

  const meta = statusMeta[po.status] || statusMeta.draft;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/procurement/orders"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{po.poNumber}</h1>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{po.supplier?.name || "No supplier"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {po.status === "draft" && (<Button variant="kazi" onClick={() => act("submit")} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit</Button>)}
          {po.status === "submitted" && (<>
            <Button variant="kazi" onClick={() => act("approve")} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Approve</Button>
            <Button variant="destructive" onClick={() => act("reject")} disabled={busy}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
          </>)}
          {po.status === "approved" && (<Button variant="kazi" onClick={() => act("order")} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />} Mark Ordered</Button>)}
          <Button variant="outline" onClick={() => router.push(`/dashboard/procurement/grns?po=${po.id}`)}>Receive Goods</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {po.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{it.description}</p>
                      <p className="text-xs text-muted-foreground">{it.quantity} {it.unit} · received {it.receivedQuantity}</p>
                    </div>
                    <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(it.lineTotal)}</p><p className="text-xs text-muted-foreground">@ {formatCurrency(it.unitCost)}</p></div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-sm"><span>Subtotal</span><span>{formatCurrency(po.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span>{formatCurrency(po.taxAmount)}</span></div>
                <div className="flex justify-between pt-2 font-semibold border-t"><span>Total</span><span>{formatCurrency(po.total)}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Approval Workflow</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {po.approvals.length === 0 ? (<p className="text-sm text-muted-foreground">No approval steps</p>) : po.approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                  <span>Level {a.level} · <span className="capitalize">{a.requiredRoleType.replace(/_/g, " ")}</span></span>
                  <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
