"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Send } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Approval {
  id: string;
  level: number;
  requiredRoleType: string;
  status: string;
  comments: string | null;
}
interface RequestItem {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  estUnitCost: string;
  lineTotal: string;
}
interface PurchaseRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  priority: string;
  totalEstimated: string;
  department: string | null;
  notes: string | null;
  neededBy: string | null;
  items: RequestItem[];
  approvals: Approval[];
  requester: { name: string } | null;
}

const statusMeta: Record<string, { label: string; variant: any }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending_approval: { label: "Pending Approval", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  ordered: { label: "Ordered", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [req, setReq] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/procurement/requests/${id}`)
      .then((r) => r.json())
      .then((data) => (data.error ? setReq(null) : setReq(data)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "submit" | "approve" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/procurement/requests/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: `Could not ${action}`, description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: `Request ${action}ed` });
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!req) {
    return (
      <DashboardShell>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Request not found</p>
          <Link href="/dashboard/procurement/requests">
            <Button variant="outline">Back to requests</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const meta = statusMeta[req.status] || statusMeta.draft;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/procurement/requests">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{req.title}</h1>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{req.requestNumber} · {req.department || "—"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {req.status === "draft" && (
            <Button variant="kazi" onClick={() => act("submit")} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit for Approval
            </Button>
          )}
          {req.status === "pending_approval" && (
            <>
              <Button variant="kazi" onClick={() => act("approve")} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button variant="destructive" onClick={() => act("reject")} disabled={busy}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => router.push(`/dashboard/procurement/orders?request=${req.id}`)}>
            Create PO
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {req.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{it.description}</p>
                      <p className="text-xs text-muted-foreground">{it.quantity} {it.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(it.lineTotal)}</p>
                      <p className="text-xs text-muted-foreground">@ {formatCurrency(it.estUnitCost)}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-semibold border-t">
                  <span>Total Estimated</span>
                  <span>{formatCurrency(req.totalEstimated)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Requester</span><span>{req.requester?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="capitalize">{req.priority}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Needed By</span><span>{req.neededBy ? new Date(req.neededBy).toLocaleDateString() : "—"}</span></div>
                {req.notes && <p className="text-muted-foreground pt-2">{req.notes}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Approval Workflow</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {req.approvals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No approval steps yet</p>
                ) : (
                  req.approvals.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                      <span>Level {a.level} · <span className="capitalize">{a.requiredRoleType.replace(/_/g, " ")}</span></span>
                      <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>
                        {a.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
