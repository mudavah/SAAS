"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });

  useEffect(() => {
    fetch("/api/customersuccess/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []))
      .catch(() => undefined);
  }, []);

  async function publish() {
    if (!form.title || !form.body) return;
    await fetch("/api/customersuccess/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await fetch("/api/customersuccess/announcements").then((r) => r.json());
    setAnnouncements(d.announcements ?? []);
    setForm({ title: "", body: "", audience: "all" });
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">Publish in-app announcements to your team.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-kazi-green" /> New Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Message"
              rows={3}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            >
              <option value="all">Everyone</option>
              <option value="plan">By Plan</option>
              <option value="organization">Organization</option>
            </select>
            <Button onClick={publish} disabled={!form.title || !form.body}>
              Publish
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active announcements.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{a.title}</div>
                      <Badge variant="outline">{a.audience}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
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
