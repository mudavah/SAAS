"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Lightbulb, MessageSquare } from "lucide-react";

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<"ticket" | "request" | "feedback">("ticket");
  const [form, setForm] = useState({ subject: "", description: "", title: "", detail: "", message: "", rating: 5 });

  useEffect(() => {
    Promise.all([
      fetch("/api/customersuccess/tickets").then((r) => r.json()).catch(() => ({ tickets: [] })),
      fetch("/api/customersuccess/feature-requests").then((r) => r.json()).catch(() => ({ featureRequests: [] })),
    ]).then(([t, f]) => {
      setTickets(t.tickets ?? []);
      setRequests(f.featureRequests ?? []);
    });
  }, []);

  async function submitTicket() {
    await fetch("/api/customersuccess/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: form.subject, description: form.description }),
    });
    const t = await fetch("/api/customersuccess/tickets").then((r) => r.json());
    setTickets(t.tickets ?? []);
    setForm({ ...form, subject: "", description: "" });
  }

  async function submitRequest() {
    await fetch("/api/customersuccess/feature-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, description: form.detail }),
    });
    const f = await fetch("/api/customersuccess/feature-requests").then((r) => r.json());
    setRequests(f.featureRequests ?? []);
    setForm({ ...form, title: "", detail: "" });
  }

  async function submitFeedback() {
    await fetch("/api/customersuccess/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: form.message, rating: form.rating }),
    });
    setForm({ ...form, message: "", rating: 5 });
  }

  async function vote(id: string) {
    await fetch("/api/customersuccess/feature-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", id }),
    });
    const f = await fetch("/api/customersuccess/feature-requests").then((r) => r.json());
    setRequests(f.featureRequests ?? []);
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Customer Success</h1>
          <p className="text-muted-foreground mt-1">Support, feature requests and feedback.</p>
        </div>

        <div className="flex gap-2">
          {(["ticket", "request", "feedback"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-sm border ${
                tab === t ? "bg-kazi-blue/10 border-kazi-blue" : "border-muted"
              }`}
            >
              {t === "ticket" ? "Support Tickets" : t === "request" ? "Feature Requests" : "Feedback"}
            </button>
          ))}
        </div>

        {tab === "ticket" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-kazi-green" /> New Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <textarea
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  placeholder="Describe the issue"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Button onClick={submitTicket} disabled={!form.subject || !form.description}>
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Your Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tickets yet.</p>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((tk) => (
                      <div key={tk.id} className="flex justify-between border-b pb-2 text-sm">
                        <div>
                          <div className="font-medium">{tk.subject}</div>
                          <div className="text-xs text-muted-foreground capitalize">{tk.priority} · {tk.createdAt?.slice(0, 10)}</div>
                        </div>
                        <Badge variant="outline">{tk.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "request" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-kazi-orange" /> Suggest a Feature
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
                  placeholder="Describe the feature"
                  rows={4}
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                />
                <Button onClick={submitRequest} disabled={!form.title || !form.detail}>
                  Submit Request
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Community Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {requests.map((r) => (
                      <div key={r.id} className="flex justify-between border-b pb-2 text-sm">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.status}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => vote(r.id)}>
                          ▲ {r.votes}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "feedback" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-kazi-blue" /> Send Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setForm({ ...form, rating: n })}
                    className={n <= form.rating ? "text-yellow-500 text-xl" : "text-muted-foreground text-xl"}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="What's on your mind?"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <Button onClick={submitFeedback} disabled={!form.message}>
                Send Feedback
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
