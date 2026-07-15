"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Smartphone, CreditCard, Building2, TrendingUp, Clock, XCircle, Link2, Settings, Receipt, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

interface Payment {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  mpesaReceipt: string | null;
  stripePaymentId: string | null;
  createdAt: string;
  invoice: { invoiceNumber: string } | null;
}

interface Stats {
  totalRevenue: number;
  pendingAmount: number;
  failedAmount: number;
  todayCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  byMethod: Record<string, { count: number; amount: number }>;
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [stkLoading, setStkLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState("payments");

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const res = await fetch("/api/payments");
      const data = await res.json();
      setPayments(data.payments ?? data);
      setStats(data.stats || null);
    } catch (error) {
      logger.error("Failed to fetch payments:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    }
  }

  async function handleStkPush() {
    if (!phone || !amount) return;
    setStkLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "mpesa", phone, amount: parseFloat(amount) }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({
          title: "Payment failed",
          description: result.error || "Could not process payment",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Payment initiated!",
        description: result.message || "Check your phone to complete payment.",
      });
      setPayments((prev) => [result.payment, ...prev]);
      setPhone("");
      setAmount("");
    } finally {
      setStkLoading(false);
    }
  }

  async function handleBankTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const reference = formData.get("reference") as string;
    const notes = formData.get("notes") as string;

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "bank_transfer", amount, reference, notes }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Failed", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Bank transfer recorded", description: `Reference: ${reference}` });
      fetchPayments();
    } catch (error) {
      toast({ title: "Error", description: "Failed to record bank transfer", variant: "destructive" });
    }
  }

  const statusVariant = (s: string) =>
    s === "completed" ? "success" : s === "pending" ? "warning" : "destructive";

  const methodIcons: Record<string, React.ReactNode> = {
    mpesa: <Smartphone className="h-4 w-4 text-kazi-green" />,
    stripe: <CreditCard className="h-4 w-4 text-blue-500" />,
    bank_transfer: <Building2 className="h-4 w-4 text-orange-500" />,
    cash: <Receipt className="h-4 w-4 text-gray-500" />,
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Accept and manage payments</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="payments">All Payments</TabsTrigger>
            <TabsTrigger value="receive">Receive Payment</TabsTrigger>
            <TabsTrigger value="links">Payment Links</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.completedCount} completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} payments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.failedAmount)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.failedCount} payments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.todayCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">transactions</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-xl bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium hidden sm:table-cell">Invoice</th>
                        <th className="text-left p-4 font-medium">Method</th>
                        <th className="text-right p-4 font-medium">Amount</th>
                        <th className="text-center p-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No payments yet</td></tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="p-4">{formatDate(p.createdAt)}</td>
                            <td className="p-4 hidden sm:table-cell">{p.invoice?.invoiceNumber || "—"}</td>
                            <td className="p-4 capitalize flex items-center gap-2">
                              {methodIcons[p.method] || <Receipt className="h-4 w-4" />}
                              {p.method.replace("_", " ")}
                            </td>
                            <td className="p-4 text-right font-medium">{formatCurrency(p.amount)}</td>
                            <td className="p-4 text-center">
                              <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-kazi-green" />
                  M-Pesa STK Push
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleStkPush(); }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Phone (254...)</Label>
                    <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254708374149" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KSh)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" />
                  </div>
                  <div className="flex items-end">
                    <Button variant="kazi" className="w-full" type="submit" disabled={stkLoading}>
                      {stkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send STK Push
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-muted-foreground mt-4">
                  Sandbox test phone: <strong>254708374149</strong>. Use format{" "}
                  <strong>2547XXXXXXXX</strong>, not 07...
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  Bank Transfer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBankTransfer} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (KSh)</Label>
                    <Input name="amount" type="number" placeholder="1000" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input name="reference" placeholder="TXN-REF-001" required />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" type="submit">
                      Record Transfer
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Payment Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Payment links feature coming soon. Use the API to generate links.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Payment Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Manage your payment providers and configurations.</p>
                <Button variant="outline" onClick={() => window.location.href = "/dashboard/settings"}>
                  Go to Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
