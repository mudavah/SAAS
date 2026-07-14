"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface PortalData {
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
  };
  assignment: {
    basicSalary: string;
    currency: string;
    structureName: string;
    effectiveDate: string;
  } | null;
  payslips: {
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
    runEmployee?: {
      details: { id: string; itemType: string; name: string; amount: string }[];
    };
  }[];
  ytd: {
    gross: number;
    net: number;
    deductions: number;
    count: number;
  };
}

interface ErrorResponse {
  error: string;
  status: number;
}

export default function EmployeePortalPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/payroll/employee");
        const data = await res.json();
        if (res.ok) {
          setData(data);
        } else {
          setError(data.error || "Unable to load payroll data");
        }
      } catch {
        setError("Failed to load payroll data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  if (loading) {
    return (
      <DashboardShell>
        <div className="py-8 text-center text-muted-foreground">Loading payroll data...</div>
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Payslips</h1>
            <p className="text-muted-foreground mt-1">View your salary and payslips</p>
          </div>
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {error || "No employee record linked to your account. Contact HR to link your employee profile."}
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Payslips</h1>
          <p className="text-muted-foreground mt-1">View your salary and payslips</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Name</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{data.employee.name}</div>
              <p className="text-xs text-muted-foreground">{data.employee.employeeNumber}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Basic Salary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {data.assignment ? formatCurrency(data.assignment.basicSalary, data.assignment.currency) : "N/A"}
              </div>
              {data.assignment && (
                <p className="text-xs text-muted-foreground">{data.assignment.structureName} • Effective {formatDate(data.assignment.effectiveDate)}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">YTD Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatCurrency(data.ytd.net)}</div>
              <p className="text-xs text-muted-foreground">{data.ytd.count} payslips</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">YTD Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatCurrency(data.ytd.deductions)}</div>
              <p className="text-xs text-muted-foreground">Gross: {formatCurrency(data.ytd.gross)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            {data.payslips.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payslips yet.</p>
            ) : (
              <div className="space-y-3">
                {data.payslips.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.payslipNumber}</p>
                        <Badge variant={p.status === "viewed" ? "default" : "secondary"}>{p.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(p.periodStart)} — {formatDate(p.periodEnd)} • Net: {formatCurrency(p.netPay)}
                      </p>
                    </div>
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
                                <p className="font-medium">{data.employee.name}</p>
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
                                    {viewData.runEmployee.details.map((d: any) => (
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
