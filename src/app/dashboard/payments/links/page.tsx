"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Copy, ExternalLink, Link2, Trash2, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface PaymentLink {
  id: string;
  slug: string;
  type: string;
  amount: string | null;
  description: string | null;
  provider: string;
  expiresAt: string | null;
  useCount: number;
  maxUses: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function PaymentLinksPage() {
  const { toast } = useToast();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [linkType, setLinkType] = useState("custom_amount");
  const [linkAmount, setLinkAmount] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [linkExpiry, setLinkExpiry] = useState("");

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      const res = await fetch("/api/payments/links");
      const data = await res.json();
      setLinks(data.links || []);
    } catch (error) {
      logger.error("Failed to fetch payment links:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLink(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/payments/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: linkType,
          amount: linkAmount ? parseFloat(linkAmount) : null,
          description: linkDescription,
          expiresAt: linkExpiry || null,
          provider: "mpesa",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Payment link created!" });
      setLinks((prev) => [data.link, ...prev]);
      setLinkAmount("");
      setLinkDescription("");
      setLinkExpiry("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to create payment link", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/pay/${slug}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  }

  async function deleteLink(slug: string) {
    try {
      const res = await fetch(`/api/payments/links/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "Failed", variant: "destructive" });
        return;
      }
      toast({ title: "Link deactivated" });
      setLinks((prev) => prev.filter((l) => l.slug !== slug));
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payment Links</h1>
          <p className="text-muted-foreground">Generate secure payment links for invoices and custom amounts</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Create Payment Link
            </CardTitle>
            <CardDescription>Generate a link customers can use to pay</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLink} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="custom_amount">Custom Amount</option>
                    <option value="invoice">Invoice</option>
                    <option value="deposit">Deposit</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    value={linkAmount}
                    onChange={(e) => setLinkAmount(e.target.value)}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  placeholder="Payment for services"
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={linkExpiry}
                  onChange={(e) => setLinkExpiry(e.target.value)}
                />
              </div>
              <Button type="submit" variant="kazi" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Payment Links</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : links.length === 0 ? (
              <p className="text-muted-foreground">No payment links yet</p>
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{link.description || link.type.replace("_", " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {link.amount ? formatCurrency(link.amount) : "Any amount"} • {link.provider}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        /pay/{link.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => copyLink(link.slug)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteLink(link.slug)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
