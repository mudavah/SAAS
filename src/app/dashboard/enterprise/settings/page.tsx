"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/enterprise/settings")
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const update = async (key: string, value: boolean) => {
    setSaving(true);
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await fetch("/api/enterprise/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Enterprise Settings</h1>
          <p className="text-muted-foreground mt-1">Organization-wide enterprise configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-kazi-green" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Consolidated Reporting</Label>
                <p className="text-xs text-muted-foreground">Combine data from all branches in reports</p>
              </div>
              <Switch
                checked={settings?.consolidatedReporting ?? true}
                onCheckedChange={(v) => update("consolidatedReporting", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Cross-Branch Inventory Visibility</Label>
                <p className="text-xs text-muted-foreground">Allow branches to see each other&apos;s stock</p>
              </div>
              <Switch
                checked={settings?.crossBranchInventoryVisibility ?? true}
                onCheckedChange={(v) => update("crossBranchInventoryVisibility", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Centralized Procurement</Label>
                <p className="text-xs text-muted-foreground">Manage all purchases from headquarters</p>
              </div>
              <Switch
                checked={settings?.centralizedProcurement ?? false}
                onCheckedChange={(v) => update("centralizedProcurement", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Branch Approval Required</Label>
                <p className="text-xs text-muted-foreground">Require approval for branch-level transactions</p>
              </div>
              <Switch
                checked={settings?.branchApprovalRequired ?? false}
                onCheckedChange={(v) => update("branchApprovalRequired", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
