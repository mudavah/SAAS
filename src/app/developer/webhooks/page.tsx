"use client";

import { useState, useEffect } from "react";
import { Webhook, Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: string;
  headers: Record<string, string>;
  createdAt: string;
};

type Delivery = {
  id: string;
  eventType: string;
  status: string;
  statusCode: number | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
};

export default function DeveloperWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("");
  const [headers, setHeaders] = useState("");
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);

  async function fetchWebhooks() {
    const res = await fetch("/api/developer/webhooks");
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function createWebhook() {
    const body = {
      name,
      url,
      events: events.split(",").map((e) => e.trim()).filter(Boolean),
      headers: headers ? JSON.parse(headers) : {},
    };

    const res = await fetch("/api/developer/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setDialogOpen(false);
      setName("");
      setUrl("");
      setEvents("");
      setHeaders("");
      fetchWebhooks();
    }
  }

  async function updateWebhook(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/developer/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchWebhooks();
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    const res = await fetch(`/api/developer/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) fetchWebhooks();
  }

  async function openDeliveries(webhook: Webhook) {
    setSelectedWebhook(webhook);
    const res = await fetch(`/api/developer/webhooks/${webhook.id}/deliveries`);
    if (res.ok) {
      const data = await res.json();
      setDeliveries(data);
    }
    setDeliveriesOpen(true);
  }

  async function retryDelivery(deliveryId: string) {
    const res = await fetch(`/api/developer/webhooks/${selectedWebhook?.id}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId }),
    });
    if (res.ok) {
      const data = await res.json();
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? data : d)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">Manage webhook subscriptions and deliveries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button variant="kazi" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Webhook" />
              </div>
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" />
              </div>
              <div>
                <label className="text-sm font-medium">Events (comma-separated)</label>
                <Input value={events} onChange={(e) => setEvents(e.target.value)} placeholder="api.key.created, webhook.created" />
              </div>
              <div>
                <label className="text-sm font-medium">Headers (JSON)</label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder='{"Authorization": "Bearer token"}'
                  className="w-full p-2 border rounded-md bg-background text-sm min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={createWebhook} disabled={!name || !url}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">URL</th>
                  <th className="text-left p-4 font-medium">Events</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{webhook.name}</td>
                    <td className="p-4 text-xs text-muted-foreground max-w-[200px] truncate">{webhook.url}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 3).map((e) => (
                          <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{webhook.events.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={webhook.status === "active" ? "default" : "secondary"} className="capitalize">
                        {webhook.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDeliveries(webhook)} className="h-8 w-8">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWebhook(webhook.id)}
                          className="text-destructive hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {webhooks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No webhooks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={deliveriesOpen} onOpenChange={setDeliveriesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deliveries — {selectedWebhook?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {deliveries.map((d) => (
              <div key={d.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{d.eventType}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.status} · attempts: {d.attempts} · {new Date(d.createdAt).toLocaleString()}
                  </p>
                  {d.errorMessage && (
                    <p className="text-xs text-destructive">{d.errorMessage}</p>
                  )}
                </div>
                {(d.status === "failed" || d.status === "retrying") && (
                  <Button variant="ghost" size="sm" onClick={() => retryDelivery(d.id)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                )}
              </div>
            ))}
            {deliveries.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No deliveries yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
