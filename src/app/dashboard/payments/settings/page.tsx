"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Smartphone, CreditCard, Building2 } from "lucide-react";

interface ProviderConfig {
  enabled: boolean;
  isDefault: boolean;
  environment: string;
}

export default function PaymentSettingsPage() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      const res = await fetch("/api/payments/providers");
      const data = await res.json();
      setConfigs(data.configs || {});
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleProvider(provider: string, enabled: boolean) {
    setSaving(provider);
    try {
      const res = await fetch("/api/payments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config: { enabled, isDefault: enabled && Object.values(configs).every(c => !c.isDefault) } }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: enabled ? "Provider enabled" : "Provider disabled" });
      setConfigs((prev) => ({ ...prev, [provider]: { ...prev[provider], enabled } }));
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  const providers = [
    { id: "mpesa", name: "M-Pesa", icon: Smartphone, description: "Safaricom M-Pesa Daraja API" },
    { id: "stripe", name: "Stripe", icon: CreditCard, description: "International card payments" },
    { id: "pesapal", name: "Pesapal", icon: CreditCard, description: "M-Pesa, Visa, Mastercard" },
    { id: "bank_transfer", name: "Bank Transfer", icon: Building2, description: "Manual bank transfers" },
  ];

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payment Settings</h1>
          <p className="text-muted-foreground">Configure your payment providers</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => {
              const config = configs[provider.id] || { enabled: false, isDefault: false, environment: "sandbox" };
              return (
                <Card key={provider.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <provider.icon className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <CardDescription>{provider.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => toggleProvider(provider.id, checked)}
                        disabled={saving === provider.id}
                      />
                    </div>
                  </CardHeader>
                  {config.enabled && (
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.isDefault ? "success" : "secondary"}>
                          {config.isDefault ? "Default" : "Enabled"}
                        </Badge>
                        <span className="text-sm text-muted-foreground capitalize">{config.environment}</span>
                      </div>
                      <div className="space-y-2">
                        <Label>Environment</Label>
                        <select
                          value={config.environment}
                          onChange={(e) => toggleProvider(provider.id, true)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
