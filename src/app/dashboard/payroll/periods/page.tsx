"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Lock, XCircle, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isLocked: boolean;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  processing: "secondary",
  closed: "outline",
  locked: "destructive",
};

export default function PayrollPeriodsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/periods");
      const data = await res.json();
      if (Array.isArray(data)) setPeriods(data);
    } catch {
      toast({ title: "Error", description: "Failed to load periods", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function reset() {
    setName("");
    setStartDate("");
    setEndDate("");
    setIsLocked(false);
  }

  async function submit() {
    if (!name.trim() || !startDate || !endDate) {
      toast({ title: "Validation", description: "Name, start date, and end date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, endDate, isLocked }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to create period", variant: "destructive" });
        return;
      }
      toast({ title: "Period created" });
      setOpen(false);
      reset();
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create period", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function closePeriod(id: string) {
    try {
      const res = await fetch(`/api/payroll/periods/${id}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to close period", variant: "destructive" });
        return;
      }
      toast({ title: "Period closed" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to close period", variant: "destructive" });
    }
  }

  async function lockPeriod(id: string) {
    try {
      const res = await fetch(`/api/payroll/periods/${id}/lock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to lock period", variant: "destructive" });
        return;
      }
      toast({ title: "Period locked" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to lock period", variant: "destructive" });
    }
  }

  async function deletePeriod(id: string) {
    if (!confirm("Delete this period?")) return;
    try {
      const res = await fetch(`/api/payroll/periods/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to delete period", variant: "destructive" });
        return;
      }
      toast({ title: "Period deleted" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete period", variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Payroll Periods</h1>
            <p className="text-muted-foreground mt-1">Define payroll periods for your organization</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="kazi">
                <Plus className="mr-2 h-4 w-4" />
                New Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Payroll Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. June 2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="isLocked" type="checkbox" checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} className="h-4 w-4 rounded border-input" />
                  <Label htmlFor="isLocked">Lock period</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Period
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading periods...</CardContent>
            </Card>
          ) : periods.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No payroll periods found.</CardContent>
            </Card>
          ) : (
            periods.map((period) => (
              <Card key={period.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{period.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(period.startDate)} — {formatDate(period.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[period.status] || "secondary"}>{period.status}</Badge>
                      {period.status === "open" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => closePeriod(period.id)}>
                            <XCircle className="mr-1 h-4 w-4" /> Close
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => lockPeriod(period.id)}>
                            <Lock className="mr-1 h-4 w-4" /> Lock
                          </Button>
                        </>
                      )}
                      {period.status === "open" && (
                        <Button variant="destructive" size="sm" onClick={() => deletePeriod(period.id)}>
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
