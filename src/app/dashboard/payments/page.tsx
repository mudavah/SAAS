"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Smartphone } from "lucide-react";

interface Payment {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  mpesaReceipt: string | null;
  createdAt: string;
  invoice: { invoiceNumber: string } | null;
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stkLoading, setStkLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => setPayments(data.payments ?? data));
  }, []);

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
          title: "STK Push failed",
          description: result.error || "Could not send M-Pesa request",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "STK Push sent!",
        description: result.message || "Check the phone to enter M-Pesa PIN.",
      });
      setPayments((prev) => [result.payment, ...prev]);
    } finally {
      setStkLoading(false);
    }
  }

  const statusVariant = (s: string) =>
    s === "completed" ? "success" : s === "pending" ? "warning" : "destructive";

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Accept M-Pesa and track transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-kazi-green" />
              M-Pesa STK Push
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Phone (254...)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254708374149" />
              </div>
              <div className="space-y-2">
                <Label>Amount (KSh)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" />
              </div>
              <div className="flex items-end">
                <Button variant="kazi" className="w-full" onClick={handleStkPush} disabled={stkLoading}>
                  {stkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send STK Push
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Sandbox test phone: <strong>254708374149</strong>. Use format{" "}
              <strong>2547XXXXXXXX</strong>, not 07...
            </p>
          </CardContent>
        </Card>

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
                    <td className="p-4 capitalize">{p.method}</td>
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
      </div>
    </DashboardShell>
  );
}
