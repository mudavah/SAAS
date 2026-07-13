"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Approval {
  id: string; resourceType: string; resourceId: string; level: number;
  requiredRoleType: string; comments: string | null;
  resourceNumber: string; resourceTitle: string; amount?: string;
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/procurement/approvals").then((r) => r.json()).then((d) => setApprovals(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function decide(a: Approval, decision: "approve" | "reject") {
    setBusy(a.id);
    try {
      const base = a.resourceType === "purchase_order" ? "orders" : "requests";
      const res = await fetch(`/api/procurement/${base}/${a.resourceId}/${decision}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { toast({ title: `Could not ${decision}`, description: d.error, variant: "destructive" }); return; }
      toast({ title: `Approval ${decision}ed` }); load();
    } finally { setBusy(null); }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground">Review and action procurement approvals</p>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          approvals.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><p className="text-muted-foreground mb-4">No pending approvals for your role</p></div>) : (
          <div className="space-y-3">
            {approvals.map((a) => (
              <Card key={a.id}><CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Level {a.level}</Badge>
                      <span className="font-semibold">{a.resourceNumber}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.resourceTitle || a.resourceType}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">Requires: {a.requiredRoleType.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/procurement/${a.resourceType === "purchase_order" ? "orders" : "requests"}/${a.resourceId}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                    <Button variant="kazi" size="sm" onClick={() => decide(a, "approve")} disabled={busy === a.id}>
                      {busy === a.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />} Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => decide(a, "reject")} disabled={busy === a.id}>
                      <XCircle className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
