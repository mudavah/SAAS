"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Eye, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Payslip {
  id: string;
  payslipNumber: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  netPay: string;
  grossEarnings: string;
  totalDeductions: string;
  totalTax: string;
  basicSalary: string;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string } | null;
  runEmployee?: {
    details: { id: string; itemType: string; name: string; amount: string }[];
  };
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  generated: "default",
  sent: "outline",
  viewed: "default",
};

export default function PayslipsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<Payslip | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/payslips");
      const data = await res.json();
      if (Array.isArray(data)) setPayslips(data);
    } catch {
      toast({ title: "Error", description: "Failed to load payslips", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendPayslip(id: string) {
    setSending(id);
    try {
      const res = await fetch(`/api/payroll/payslips/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to send payslip", variant: "destructive" });
        return;
      }
      toast({ title: "Payslip sent" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to send payslip", variant: "destructive" });
    } finally {
      setSending(null);
    }
  }

  async function viewPayslip(id: string) {
    try {
      const res = await fetch(`/api/payroll/payslips/${id}/view`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to view payslip", variant: "destructive" });
        return;
      }
      setViewData(data);
      setViewingId(id);
    } catch {
      toast({ title: "Error", description: "Failed to view payslip", variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payslips</h1>
          <p className="text-muted-foreground mt-1">View and manage employee payslips</p>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading payslips...</CardContent>
            </Card>
          ) : payslips.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No payslips found.</CardContent>
            </Card>
          ) : (
            payslips.map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{p.payslipNumber}</h3>
                        <Badge variant={statusVariant[p.status] || "secondary"}>{p.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {p.employee ? `${p.employee.firstName} ${p.employee.lastName} (${p.employee.employeeNumber})` : "Unknown employee"} • {formatDate(p.periodStart)} — {formatDate(p.periodEnd)} • Net: {formatCurrency(p.netPay)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status !== "sent" && p.status !== "viewed" && (
                        <Button variant="outline" size="sm" onClick={() => sendPayslip(p.id)} disabled={sending === p.id}>
                          {sending === p.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                          Send
                        </Button>
                      )}
                      <Dialog open={viewingId === p.id} onOpenChange={(v) => { if (!v) setViewingId(null); }}>
                      <DialogTrigger>
                        <Button variant="ghost" size="sm" onClick={() => viewPayslip(p.id)}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Payslip {p.payslipNumber}</DialogTitle>
                          </DialogHeader>
                          {viewData && (
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Employee</p>
                                  <p className="font-medium">{viewData.employee?.firstName} {viewData.employee?.lastName}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Period</p>
                                  <p className="font-medium">{formatDate(viewData.periodStart)} — {formatDate(viewData.periodEnd)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Basic Salary</p>
                                  <p className="font-medium">{formatCurrency(viewData.basicSalary)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Gross Earnings</p>
                                  <p className="font-medium">{formatCurrency(viewData.grossEarnings)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total Deductions</p>
                                  <p className="font-medium">{formatCurrency(viewData.totalDeductions)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total Tax</p>
                                  <p className="font-medium">{formatCurrency(viewData.totalTax)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Net Pay</p>
                                  <p className="font-semibold text-lg">{formatCurrency(viewData.netPay)}</p>
                                </div>
                              </div>
                              {viewData.runEmployee?.details && viewData.runEmployee.details.length > 0 && (
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
                                      {viewData.runEmployee.details.map((d) => (
                                        <tr key={d.id} className="border-t">
                                          <td className="py-1.5">{d.name}</td>
                                          <td className="py-1.5"><Badge variant="outline">{d.itemType}</Badge></td>
                                          <td className="py-1.5 text-right">{formatCurrency(d.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
