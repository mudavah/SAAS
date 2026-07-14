"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
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

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function DeveloperKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  async function fetchKeys() {
    const res = await fetch("/api/developer/keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function createKey() {
    const body: Record<string, unknown> = { name, scopes: scopes ? scopes.split(",").map((s) => s.trim()) : [] };
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setCreatedSecret(data.secret);
      setDialogOpen(false);
      setName("");
      setScopes("");
      setExpiresAt("");
      fetchKeys();
    }
  }

  async function updateKey(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/developer/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchKeys();
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? This action cannot be undone.")) return;
    const res = await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    if (res.ok) fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys and access scopes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button variant="kazi" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" />
              </div>
              <div>
                <label className="text-sm font-medium">Scopes (comma-separated)</label>
                <Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="api.keys.manage, invoices.view" />
              </div>
              <div>
                <label className="text-sm font-medium">Expires At (optional)</label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={createKey} disabled={!name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {createdSecret && (
        <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm font-medium mb-2">Save this secret now. It will not be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-muted p-2 rounded overflow-x-auto">
              {showSecret ? createdSecret : "••••••••••••••••••••••••••••••••"}
            </code>
            <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdSecret)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
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
                  <th className="text-left p-4 font-medium">Prefix</th>
                  <th className="text-left p-4 font-medium">Scopes</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{key.name}</td>
                    <td className="p-4 font-mono text-xs">{key.keyPrefix}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={key.status === "active" ? "default" : "secondary"} className="capitalize">
                        {key.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <select
                          value={key.status}
                          onChange={(e) => updateKey(key.id, { status: e.target.value })}
                          className="p-1 border rounded bg-background text-xs"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="revoked">Revoked</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => revokeKey(key.id)}
                          className="text-destructive hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No API keys found. Create one to get started.
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
