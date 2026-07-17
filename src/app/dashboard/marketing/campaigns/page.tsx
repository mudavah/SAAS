"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Megaphone } from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", subject: "", html: "", audience: "all" });

  useEffect(() => {
    fetch("/api/marketing/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []))
      .catch(() => undefined);
  }, []);

  async function save() {
    if (!form.name || !form.subject || !form.html) return;
    await fetch("/api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await fetch("/api/marketing/campaigns").then((r) => r.json());
    setCampaigns(d.campaigns ?? []);
    setForm({ name: "", subject: "", html: "", audience: "all" });
  }

  async function send(id: string) {
    await fetch("/api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", id }),
    });
    const d = await fetch("/api/marketing/campaigns").then((r) => r.json());
    setCampaigns(d.campaigns ?? []);
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">Compose and send product updates to your customers.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-kazi-green" /> New Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Campaign name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <textarea
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Email HTML body"
              rows={5}
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
            />
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            >
              <option value="all">All plans</option>
              <option value="free">Free only</option>
              <option value="pro">Pro only</option>
              <option value="business">Business only</option>
            </select>
            <Button onClick={save} disabled={!form.name || !form.subject || !form.html}>
              Save Draft
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.subject} · {c.recipientCount || 0} recipients
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{c.status}</Badge>
                      {c.status === "draft" && (
                        <Button variant="outline" size="sm" onClick={() => send(c.id)}>
                          <Send className="h-3 w-3 mr-1" /> Send
                        </Button>
                      )}
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
