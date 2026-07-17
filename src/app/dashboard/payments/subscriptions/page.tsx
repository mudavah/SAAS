"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard, CheckCircle2, XCircle, Clock, ArrowDownToLine, Ban, ExternalLink } from "lucide-react";
import { PRICING } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  provider: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  gracePeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "business">("free");
  const [taxInvoices, setTaxInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch("/api/payments/subscriptions").then((r) => r.json()),
        fetch("/api/payments/subscriptions/invoices").then((r) => r.json()).catch(() => ({ invoices: [] })),
      ]);
      setSubscription(subRes.subscriptions?.[0] || null);
      setPlan(subRes.plan || "free");
      setTaxInvoices(invRes.invoices ?? []);
    } catch (error) {
      logger.error("Failed to fetch subscription:", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(targetPlan: "pro" | "business") {
    setBusy(targetPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, coupon: coupon || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not start checkout", description: data.error || "Something went wrong.", variant: "destructive" });
        return;
      }
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  }

  async function handleDowngrade(targetPlan: "pro" | "free") {
    setBusy(`downgrade-${targetPlan}`);
    try {
      const res = await fetch("/api/payments/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "downgrade", plan: targetPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Downgrade failed", description: data.error || "Something went wrong.", variant: "destructive" });
      } else {
        toast({ title: "Downgrade scheduled", description: `You'll move to ${targetPlan} at period end.` });
        fetchSubscription();
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    setBusy("cancel");
    try {
      const res = await fetch("/api/payments/subscriptions", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Cancel failed", description: data.error || "Something went wrong.", variant: "destructive" });
      } else {
        toast({ title: "Subscription cancelled", description: "It stays active until period end." });
        fetchSubscription();
      }
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch("/api/payments/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: "Billing portal unavailable", description: data.error, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function validateCoupon() {
    if (!coupon) return;
    setBusy("coupon");
    try {
      const res = await fetch("/api/payments/subscriptions/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", code: coupon, plan: plan === "free" ? "pro" : plan }),
      });
      const data = await res.json();
      setCouponMsg(res.ok ? `Coupon applied: ${data.coupon.code} (${data.coupon.type} ${data.coupon.value})` : data.error);
    } finally {
      setBusy(null);
    }
  }

  const statusIcon: Record<string, React.ReactNode> = {
    active: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    trialing: <Clock className="h-5 w-5 text-blue-500" />,
    cancelled: <XCircle className="h-5 w-5 text-red-500" />,
    past_due: <Clock className="h-5 w-5 text-yellow-500" />,
  };

  const isPaid = plan === "pro" || plan === "business";

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your subscription, coupons, and billing</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold capitalize">{plan}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan === "free" ? "Free forever" : `${PRICING[plan as keyof typeof PRICING]?.price || 0} KES/month`}
                    </p>
                  </div>
                  {subscription && statusIcon[subscription.status]}
                </div>
                {subscription?.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Current period ends: {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
                {subscription?.trialEnd && new Date(subscription.trialEnd) > new Date() && (
                  <p className="text-sm text-blue-600 mt-1">Trial ends: {formatDate(subscription.trialEnd)}</p>
                )}
                {subscription?.gracePeriodEnd && (
                  <p className="text-sm text-yellow-600 mt-1">Grace period until: {formatDate(subscription.gracePeriodEnd)}</p>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <Badge variant="secondary" className="mt-2">Cancels at period end</Badge>
                )}
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={openPortal} disabled={busy === "portal" || !isPaid}>
                    {busy === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ExternalLink className="mr-2 h-4 w-4" /> Billing Portal
                  </Button>
                </div>
              </CardContent>
            </Card>

            {plan === "free" && (
              <Card>
                <CardHeader>
                  <CardTitle>Upgrade Plan</CardTitle>
                  <CardDescription>Unlock unlimited invoices, M-Pesa, and more</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(["pro", "business"] as const).map((p) => (
                      <div
                        key={p}
                        className={`border rounded-lg p-4 ${plan === (p as "free" | "pro" | "business") ? "border-kazi-green bg-kazi-green/5" : ""}`}
                      >
                        <h3 className="font-semibold">{PRICING[p].name}</h3>
                        <p className="text-2xl font-bold mt-1">
                          KSh {PRICING[p].price.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                        {plan === (p as "free" | "pro" | "business") ? (
                          <Badge variant="success" className="mt-3">Current Plan</Badge>
                        ) : (
                          <Button
                            variant="kazi"
                            size="sm"
                            className="mt-3 w-full"
                            disabled={busy === p}
                            onClick={() => handleUpgrade(p)}
                          >
                            {busy === p && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upgrade to {PRICING[p].name}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 border rounded-md px-3 py-2 bg-background text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={validateCoupon} disabled={busy === "coupon"}>
                      Apply
                    </Button>
                  </div>
                  {couponMsg && <p className="text-xs text-muted-foreground mt-2">{couponMsg}</p>}
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Secure card payments processed by Stripe. Cancel anytime.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPaid && (
              <Card>
                <CardHeader>
                  <CardTitle>Manage Plan</CardTitle>
                  <CardDescription>Downgrade or cancel your subscription</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan === "business" && (
                    <Button variant="outline" className="w-full" onClick={() => handleDowngrade("pro")} disabled={busy === "downgrade-pro"}>
                      <ArrowDownToLine className="mr-2 h-4 w-4" /> Downgrade to Pro
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => handleDowngrade("free")} disabled={busy === "downgrade-free"}>
                      <ArrowDownToLine className="mr-2 h-4 w-4" /> Downgrade to Free
                    </Button>
                  <Button variant="destructive" className="w-full" onClick={handleCancel} disabled={busy === "cancel" || subscription?.cancelAtPeriodEnd}>
                    <Ban className="mr-2 h-4 w-4" /> Cancel Subscription
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Tax Invoices</CardTitle>
                <CardDescription>Subscription billing records</CardDescription>
              </CardHeader>
              <CardContent>
                {taxInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tax invoices yet.</p>
                ) : (
                  <div className="space-y-2">
                    {taxInvoices.map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between border-b pb-2 text-sm">
                        <div>
                          <div className="font-medium">{inv.number}</div>
                          <div className="text-xs text-muted-foreground">
                            {inv.total} {inv.currency} · {inv.status}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
