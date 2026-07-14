"use client";

import { useState, useEffect } from "react";
import { AppWindow, Plus, Trash2 } from "lucide-react";
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

type OAuthClient = {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  status: string;
  createdAt: string;
};

export default function DeveloperOAuthPage() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [scopes, setScopes] = useState("");
  const [plaintextSecret, setPlaintextSecret] = useState<string | null>(null);

  async function fetchClients() {
    const res = await fetch("/api/developer/oauth");
    if (res.ok) {
      const data = await res.json();
      setClients(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  async function createClient() {
    const body = {
      name,
      redirectUris: redirectUris.split("\n").filter((r) => r.trim()),
      scopes: scopes ? scopes.split(",").map((s) => s.trim()) : [],
    };

    const res = await fetch("/api/developer/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setPlaintextSecret(data.plaintextSecret);
      setDialogOpen(false);
      setName("");
      setRedirectUris("");
      setScopes("");
      fetchClients();
    }
  }

  async function updateClient(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/developer/oauth/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchClients();
  }

  async function revokeClient(id: string) {
    if (!confirm("Revoke this OAuth client?")) return;
    const res = await fetch(`/api/developer/oauth/${id}`, { method: "DELETE" });
    if (res.ok) fetchClients();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">OAuth Apps</h1>
          <p className="text-muted-foreground">Manage OAuth 2.0 client applications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button variant="kazi" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Register App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register OAuth App</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">App Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Integration" />
              </div>
              <div>
                <label className="text-sm font-medium">Redirect URIs (one per line)</label>
                <textarea
                  value={redirectUris}
                  onChange={(e) => setRedirectUris(e.target.value)}
                  placeholder="https://example.com/callback"
                  className="w-full p-2 border rounded-md bg-background text-sm min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scopes (comma-separated)</label>
                <Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="invoices.view, invoices.create" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={createClient} disabled={!name}>Register</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {plaintextSecret && (
        <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm font-medium mb-2">Client secret. Save it now — it will not be shown again.</p>
          <code className="block text-xs bg-muted p-2 rounded break-all">{plaintextSecret}</code>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Client ID</th>
                  <th className="text-left p-4 font-medium">Redirect URIs</th>
                  <th className="text-left p-4 font-medium">Scopes</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{client.name}</td>
                    <td className="p-4 font-mono text-xs">{client.clientId}</td>
                    <td className="p-4 text-xs text-muted-foreground max-w-[200px] truncate">
                      {client.redirectUris.join(", ")}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {client.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
                        {client.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revokeClient(client.id)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No OAuth clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
