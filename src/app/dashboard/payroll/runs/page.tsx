"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

interface PayrollRun {
  id: string;
  runNumber: string;
  status: string;
  totalEmployees: number;
  totalNet: string;
  totalGross: string;
  processedAt: string | null;
  period: { id: string; name: string } | null;
}

interface PayrollPeriod {
  id: string;
  name: string;
  status: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  calculated: "default",
  pending_approval: "default",
  approved: "default",
  rejected: "destructive",
  paid: "outline",
  cancelled: "outline",
};

export default function PayrollRunsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveAction, setApproveAction] = useState("approve");
  const [approveComment, setApproveComment] = useState("");
  const [approveSaving, setApproveSaving] = useState(false);

  const [periodId, setPeriodId] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, periodsRes] = await Promise.all([
        fetch("/api/payroll/runs"),
        fetch("/api/payroll/periods"),
      ]);
      const runsData = await runsRes.json();
      const periodsData = await periodsRes.json();
      if (Array.isArray(runsData)) setRuns(runsData);
      const openPeriods = Array.isArray(periodsData) ? periodsData.filter((p: PayrollPeriod) => p.status === "open") : [];
      setPeriods(openPeriods);
    } catch {
      toast({ title: "Error", description: "Failed to load runs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setPeriodId("");
    setNotes("");
  }

  async function submit() {
    if (!periodId) {
      toast({ title: "Validation", description: "Select a payroll period", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollPeriodId: periodId, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to create run", variant: "destructive" });
        return;
      }
      toast({ title: "Run created" });
      setOpen(false);
      reset();
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create run", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function processRun(id: string) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/process`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to process run", variant: "destructive" });
        return;
      }
      toast({ title: "Run processed" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to process run", variant: "destructive" });
    }
  }

  function openApprove(id: string) {
    setApproveId(id);
    setApproveAction("approve");
    setApproveComment("");
    setApproveOpen(true);
  }

  async function submitApprove() {
    if (!approveId) return;
    setApproveSaving(true);
    try {
      const res = await fetch(`/api/payroll/runs/${approveId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approveAction, comment: approveComment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to update run", variant: "destructive" });
        return;
      }
      toast({ title: approveAction === "approve" ? "Run approved" : "Run rejected" });
      setApproveOpen(false);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to update run", variant: "destructive" });
    } finally {
      setApproveSaving(false);
    }
  }

  async function markPaid(id: string) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to mark paid", variant: "destructive" });
        return;
      }
      toast({ title: "Run marked as paid" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to mark paid", variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Payroll Runs</h1>
            <p className="text-muted-foreground mt-1">Process and manage payroll runs</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="kazi">
                <Plus className="mr-2 h-4 w-4" />
                New Run
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Payroll Run</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Payroll Period</Label>
                  <Select value={periodId} onValueChange={setPeriodId}>
                    <SelectTrigger id="period">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Run
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading runs...</CardContent>
            </Card>
          ) : runs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No payroll runs found.</CardContent>
            </Card>
          ) : (
            runs.map((run) => (
              <Card key={run.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{run.runNumber}</h3>
                        <Badge variant={statusVariant[run.status] || "secondary"}>{run.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {run.period?.name || "No period"} • {run.totalEmployees} employees • Net: {formatCurrency(run.totalNet)}
                      </p>
                      {run.processedAt && (
                        <p className="text-xs text-muted-foreground">Processed: {new Date(run.processedAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {run.status === "draft" && (
                        <Button variant="outline" size="sm" onClick={() => processRun(run.id)}>
                          <Play className="mr-1 h-4 w-4" /> Process
                        </Button>
                      )}
                      {(run.status === "calculated" || run.status === "pending_approval") && (
                        <Button variant="outline" size="sm" onClick={() => openApprove(run.id)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                      )}
                      {run.status === "approved" && (
                        <Button variant="outline" size="sm" onClick={() => markPaid(run.id)}>
                          <Send className="mr-1 h-4 w-4" /> Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{approveAction === "approve" ? "Approve Payroll Run" : "Reject Payroll Run"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select value={approveAction} onValueChange={setApproveAction}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea id="comment" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={approveSaving}>Cancel</Button>
              <Button onClick={submitApprove} disabled={approveSaving} variant={approveAction === "reject" ? "destructive" : "default"}>
                {approveSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {approveAction === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
