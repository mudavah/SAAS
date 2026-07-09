"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { etimsConfigSchema, type EtimsConfigInput } from "@/lib/validations";
import { useToast } from "@/components/ui/use-toast";

export default function EtimsConfigPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EtimsConfigInput>({
    tin: "",
    pin: "",
    deviceId: "",
    apiKey: "",
    environment: "sandbox",
    isActive: false,
  });

  useEffect(() => {
    fetch("/api/etims/config")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setFormData({
            tin: data.tin || "",
            pin: data.pin || "",
            deviceId: data.deviceId || "",
            apiKey: data.apiKey || "",
            environment: data.environment || "sandbox",
            isActive: data.isActive || false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/etims/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Configuration saved", description: "Your eTIMS settings have been updated." });
    } finally {
      setSaving(false);
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

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">eTIMS Configuration</h1>
          <p className="text-muted-foreground">Connect your KRA eTIMS account for tax compliance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-kazi-green" />
              KRA eTIMS Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tin">Tax Identification Number (TIN) *</Label>
                <Input
                  id="tin"
                  value={formData.tin}
                  onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                  placeholder="P051234567M"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN *</Label>
                <Input
                  id="pin"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  placeholder="Your eTIMS PIN"
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID *</Label>
                <Input
                  id="deviceId"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  placeholder="Your eTIMS Device ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Your eTIMS API Key"
                />
              </div>

              <div className="space-y-2">
                <Label>Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(v: "sandbox" | "production") => setFormData({ ...formData, environment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
                  Enable eTIMS integration
                </Label>
              </div>

              <Button type="submit" variant="kazi" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-kazi-orange" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Register for KRA eTIMS at <strong>etims.kra.go.ke</strong></p>
            <p>2. Obtain your TIN, PIN, Device ID, and API Key</p>
            <p>3. Enter the details above and enable the integration</p>
            <p>4. Invoices will be automatically submitted to KRA when marked as sent</p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
