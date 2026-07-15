"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PRICING } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  provider: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "business">("free");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch("/api/payments/subscriptions");
      const data = await res.json();
      setSubscription(data.subscriptions?.[0] || null);
      setPlan(data.plan || "free");
    } catch (error) {
      logger.error("Failed to fetch subscription:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(targetPlan: "pro" | "business") {
    setUpgrading(targetPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Could not start checkout",
          description: data.error || "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setUpgrading(null);
    }
  }

  const statusIcon: Record<string, React.ReactNode> = {
    active: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    trialing: <Clock className="h-5 w-5 text-blue-500" />,
    cancelled: <XCircle className="h-5 w-5 text-red-500" />,
    past_due: <Clock className="h-5 w-5 text-yellow-500" />,
  };

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
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
                        className={`border rounded-lg p-4 ${
                          (plan as string) === p ? "border-kazi-green bg-kazi-green/5" : ""
                        }`}
                      >
                        <h3 className="font-semibold">{PRICING[p].name}</h3>
                        <p className="text-2xl font-bold mt-1">
                          KSh {PRICING[p].price.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                        {(plan as string) === p ? (
                          <Badge variant="success" className="mt-3">Current Plan</Badge>
                        ) : (
                          <Button
                            variant="kazi"
                            size="sm"
                            className="mt-3 w-full"
                            disabled={upgrading === p}
                            onClick={() => handleUpgrade(p)}
                          >
                            {upgrading === p && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upgrade to {PRICING[p].name}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Secure card payments processed by Stripe. Cancel anytime.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
