"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Check, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface ApprovalStep {
  id: string;
  stepOrder: number;
  label: string | null;
  approverRole: string | null;
  status: string;
  comment: string | null;
}
interface ApprovalRequest {
  id: string;
  title: string;
  resourceType: string;
  status: string;
  currentStep: number;
  createdAt: string;
  steps: ApprovalStep[];
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "approved") return "default";
  if (s === "rejected") return "destructive";
  if (s === "pending") return "secondary";
  return "outline";
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/approvals/requests").then((x) => x.json());
      setRequests(r.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: "approve" | "reject") {
    setActing(id + decision);
    try {
      const res = await fetch(`/api/approvals/requests/${id}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      toast({ title: `Request ${decision === "approve" ? "approved" : "rejected"}` });
      load();
    } finally {
      setActing(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-kazi-orange" /> Approvals
          </h1>
          <p className="text-muted-foreground">Review and decide on approval requests from automations and modules.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-2">Pending ({pending.length})</h2>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing awaiting approval.</p>
              ) : (
                <div className="grid gap-2">
                  {pending.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.title}</span>
                            <Badge variant="outline">{r.resourceType}</Badge>
                          </div>
                          <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                        </div>
                        {r.steps?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {r.steps.map((s) => (
                              <Badge key={s.id} variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "outline"} className="text-xs">
                                {s.label || `Step ${s.stepOrder}`}: {s.status}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => decide(r.id, "reject")} disabled={acting === r.id + "reject"}>
                              {acting === r.id + "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />} Reject
                            </Button>
                            <Button size="sm" onClick={() => decide(r.id, "approve")} disabled={acting === r.id + "approve"}>
                              {acting === r.id + "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {resolved.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Resolved</h2>
                <div className="grid gap-2">
                  {resolved.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.title}</span>
                          <Badge variant="outline">{r.resourceType}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                          <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
