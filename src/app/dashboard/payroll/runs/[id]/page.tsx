"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Play, CheckCircle2, FileText, BookOpen, Download, Send, Loader2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";

interface RunDetail {
  id: string;
  runNumber: string;
  status: string;
  totalEmployees: number;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  notes: string | null;
  processedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  period: { id: string; name: string; startDate: string; endDate: string } | null;
  employees: {
    id: string;
    employee: { id: string; firstName: string; lastName: string; employeeNumber: string };
    basicSalary: string;
    grossEarnings: string;
    totalDeductions: string;
    netPay: string;
    details: { id: string; itemType: string; name: string; amount: string }[];
  }[];
  approvals: { id: string; action: string; comment: string | null; approver: { name: string } }[];
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

export default function PayrollRunDetailPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveAction, setApproveAction] = useState("approve");
  const [approveComment, setApproveComment] = useState("");
  const [approveSaving, setAppveSaving] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/runs/${id}`);
      const data = await res.json();
      if (res.ok) setRun(data);
    } catch {
      toast({ title: "Error", description: "Failed to load run", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function processRun() {
    setProcessing(true);
    try {
      const res = await fetch(`/api/payroll/runs/${id}/process`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to process", variant: "destructive" });
        return;
      }
      toast({ title: "Run processed" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to process run", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }

  function openApprove() {
    setApproveAction("approve");
    setApproveComment("");
    setApproveOpen(true);
  }

  async function submitApprove() {
    setAppveSaving(true);
    try {
      const res = await fetch(`/api/payroll/runs/${id}/approve`, {
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
      setAppveSaving(false);
    }
  }

  async function generatePayslips() {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/payslips`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to generate payslips", variant: "destructive" });
        return;
      }
      toast({ title: "Payslips generated" });
      router.push("/dashboard/payroll/payslips");
    } catch {
      toast({ title: "Error", description: "Failed to generate payslips", variant: "destructive" });
    }
  }

  async function postJournal() {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/journal`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to post journal", variant: "destructive" });
        return;
      }
      toast({ title: "Journal posted" });
    } catch {
      toast({ title: "Error", description: "Failed to post journal", variant: "destructive" });
    }
  }

  async function exportRun() {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to export", variant: "destructive" });
        return;
      }
      toast({ title: "Export generated" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  }

  async function markPaid() {
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

  function toggleExpand(empId: string) {
    setExpanded((prev) => ({ ...prev, [empId]: !prev[empId] }));
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-8 text-center text-muted-foreground">Loading run...</div>
      </DashboardShell>
    );
  }

  if (!run) {
    return (
      <DashboardShell>
        <div className="py-8 text-center text-muted-foreground">Run not found.</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Run {run.runNumber}</h1>
            <p className="text-muted-foreground mt-1">
              {run.period?.name || "Unknown period"} • {run.period?.startDate && run.period?.endDate ? `${formatDate(run.period.startDate)} — ${formatDate(run.period.endDate)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[run.status] || "secondary"}>{run.status}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{run.totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(run.totalGross)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(run.totalDeductions)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(run.totalNet)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {run.status === "draft" && (
            <Button onClick={processRun} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Play className="mr-2 h-4 w-4" /> Process
            </Button>
          )}
          {(run.status === "calculated" || run.status === "pending_approval") && (
            <Button variant="outline" onClick={openApprove}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {run.status === "approved" && (
            <>
              <Button variant="outline" onClick={generatePayslips}>
                <FileText className="mr-2 h-4 w-4" /> Generate Payslips
              </Button>
              <Button variant="outline" onClick={postJournal}>
                <BookOpen className="mr-2 h-4 w-4" /> Post Journal
              </Button>
              <div className="flex items-center gap-2">
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportRun}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
              <Button variant="outline" onClick={markPaid}>
                <Send className="mr-2 h-4 w-4" /> Mark Paid
              </Button>
            </>
          )}
        </div>

        {run.notes && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{run.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Employees ({run.employees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Basic Salary</th>
                    <th className="pb-3 font-medium">Gross</th>
                    <th className="pb-3 font-medium">Deductions</th>
                    <th className="pb-3 font-medium">Net</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {run.employees.map((emp) => (
                    <>
                      <tr key={emp.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{emp.employee.firstName} {emp.employee.lastName}</p>
                            <p className="text-xs text-muted-foreground">{emp.employee.employeeNumber}</p>
                          </div>
                        </td>
                        <td className="py-3">{formatCurrency(emp.basicSalary)}</td>
                        <td className="py-3">{formatCurrency(emp.grossEarnings)}</td>
                        <td className="py-3">{formatCurrency(emp.totalDeductions)}</td>
                        <td className="py-3 font-semibold">{formatCurrency(emp.netPay)}</td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" onClick={() => toggleExpand(emp.id)}>
                            {expanded[emp.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </td>
                      </tr>
                      {expanded[emp.id] && (
                        <tr key={`${emp.id}-details`}>
                          <td colSpan={6} className="py-3 pl-8">
                            <div className="rounded-lg bg-muted/40 p-3">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="pb-2 font-medium">Item</th>
                                    <th className="pb-2 font-medium">Type</th>
                                    <th className="pb-2 font-medium text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emp.details.map((d) => (
                                    <tr key={d.id} className="border-t">
                                      <td className="py-1.5">{d.name}</td>
                                      <td className="py-1.5"><Badge variant="outline">{d.itemType}</Badge></td>
                                      <td className="py-1.5 text-right">{formatCurrency(d.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {run.approvals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {run.approvals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="font-medium text-sm">{a.approver.name}</p>
                      <p className="text-xs text-muted-foreground">{a.comment || "No comment"}</p>
                    </div>
                    <Badge variant={a.action === "approve" ? "default" : "destructive"}>{a.action}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
