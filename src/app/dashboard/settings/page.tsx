"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRICING } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="max-w-2xl mx-auto p-8 text-muted-foreground">
            Loading settings...
          </div>
        </DashboardShell>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const plan = session?.user?.plan || "free";
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Subscription started!",
        description: "Your plan will update shortly after payment confirms.",
      });
    }
    if (searchParams.get("cancelled") === "true") {
      toast({
        title: "Checkout cancelled",
        description: "No changes were made to your subscription.",
      });
    }
  }, [searchParams, toast]);

   async function handleUpgrade(targetPlan: "pro" | "business") {
    setLoadingPlan(targetPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });

      if (!res.ok) {
        toast({
          title: "Could not start checkout",
          description:
            res.status === 503
              ? "Online upgrades are not available right now. Please try again later."
              : "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and subscription
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              {session?.user?.name}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              {session?.user?.email}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Plan:</span>
              <Badge className="capitalize">{plan}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Upgrade to unlock unlimited invoices, M-Pesa, and more
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["pro", "business"] as const).map((p) => (
                <div
                  key={p}
                  className={`border rounded-lg p-4 ${
                    plan === p ? "border-kazi-green bg-kazi-green/5" : ""
                  }`}
                >
                  <h3 className="font-semibold">{PRICING[p].name}</h3>
                  <p className="text-2xl font-bold mt-1">
                    KSh {PRICING[p].price.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                  {plan === p ? (
                    <Badge variant="success" className="mt-3">
                      Current Plan
                    </Badge>
                  ) : (
                    <Button
                      variant="kazi"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={loadingPlan === p}
                      onClick={() => handleUpgrade(p)}
                    >
                      {loadingPlan === p && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Upgrade to {PRICING[p].name}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Secure card payments processed by Stripe. Cancel anytime.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Multi-user team access</li>
              <li>• Custom invoice branding</li>
              <li>• API access for integrations</li>
              <li>• Recurring invoices</li>
              <li>• Inventory management</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
