"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Send, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  notes: string | null;
  client: { name: string; email: string | null } | null;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function sendInvoice() {
    if (!invoice?.client?.email) {
      toast({
        title: "Cannot send",
        description: "Add an email address to this client first.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("send");
    try {
      const res = await fetch(`/api/invoices/${params.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({
        title: "Invoice sent!",
        description: data.message,
      });
      setInvoice((prev) => prev ? { ...prev, status: "sent" } : prev);
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
        </div>
      </DashboardShell>
    );
  }

  if (!invoice) {
    return (
      <DashboardShell>
        <p className="text-center py-20 text-muted-foreground">Invoice not found</p>
      </DashboardShell>
    );
  }

  const balance = parseFloat(invoice.total) - parseFloat(invoice.amountPaid || "0");

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/invoices">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
              <Badge className="capitalize mt-1">{invoice.status}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener">
              <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />PDF</Button>
            </a>
            <Button
              variant="kazi"
              size="sm"
              onClick={sendInvoice}
              disabled={actionLoading === "send" || !invoice.client?.email}
              title={
                invoice.client?.email
                  ? "Email invoice to client and mark as sent"
                  : "Client needs an email address"
              }
            >
              {actionLoading === "send" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Send Email
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground -mt-4">
          <strong>Send Email</strong> delivers a branded email with the invoice PDF
          attached to{" "}
          {invoice.client?.email || "the client (add their email first)"} and marks
          the invoice as <em>sent</em>.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Client:</span> {invoice.client?.name || "—"}</div>
              <div><span className="text-muted-foreground">Issue Date:</span> {formatDate(invoice.issueDate)}</div>
              <div><span className="text-muted-foreground">Due Date:</span> {formatDate(invoice.dueDate)}</div>
              <div><span className="text-muted-foreground">Balance:</span> <span className="font-bold text-kazi-green">{formatCurrency(balance, invoice.currency)}</span></div>
            </div>

            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{item.description}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                    <td className="text-right py-2 font-medium">{formatCurrency(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t pt-4 space-y-1 text-sm text-right">
              <p>Subtotal: {formatCurrency(invoice.subtotal, invoice.currency)}</p>
              <p>VAT ({invoice.taxRate}%): {formatCurrency(invoice.taxAmount || "0", invoice.currency)}</p>
              <p className="text-lg font-bold">Total: {formatCurrency(invoice.total, invoice.currency)}</p>
            </div>

            {invoice.notes && (
              <div className="border-t pt-4 text-sm">
                <p className="text-muted-foreground">Notes:</p>
                <p>{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
