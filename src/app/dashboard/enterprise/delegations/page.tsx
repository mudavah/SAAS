"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";

const SCOPES = ["organization", "branch"];

export default function DelegationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    delegateId: "",
    scope: "organization",
    permissions: [] as string[],
    expiresAt: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/enterprise/delegations").then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()).catch(() => ({ members: [] })),
    ])
      .then(([d, t]) => {
        setItems(d.delegations ?? []);
        setMembers(t.members ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/enterprise/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      const d = await fetch("/api/enterprise/delegations").then((r) => r.json());
      setItems(d.delegations ?? []);
      setForm({ delegateId: "", scope: "organization", permissions: [], expiresAt: "" });
    } finally {
      setSaving(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/enterprise/delegations/${id}`, { method: "DELETE" });
    const d = await fetch("/api/enterprise/delegations").then((r) => r.json());
    setItems(d.delegations ?? []);
  }

  const PERMS = [
    "enterprise.view",
    "enterprise.branches.manage",
    "enterprise.members.manage",
    "enterprise.pricing.manage",
    "enterprise.transfers.manage",
    "enterprise.sales.manage",
    "enterprise.procurement.manage",
    "enterprise.reports.view",
    "enterprise.approvals.manage",
    "enterprise.approvals.approve",
    "enterprise.settings.manage",
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Delegated Administration</h1>
          <p className="text-muted-foreground mt-1">
            Grant limited admin powers to members for a bounded period.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-kazi-blue" /> Grant Delegation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.delegateId}
              onChange={(e) => setForm({ ...form, delegateId: e.target.value })}
            >
              <option value="">Select member…</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as any })}
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s === "organization" ? "Whole Organization" : "Single Branch"}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {PERMS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        permissions: e.target.checked
                          ? [...form.permissions, p]
                          : form.permissions.filter((x) => x !== p),
                      })
                    }
                  />
                  {p.replace("enterprise.", "")}
                </label>
              ))}
            </div>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
            <Button onClick={save} disabled={saving || !form.delegateId}>
              {saving ? "Saving…" : "Grant Delegation"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active &amp; Historical Delegations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No delegations yet.</div>
            ) : (
              <div className="space-y-3">
                {items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium">{d.delegate?.name || d.delegate?.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.scope} · {d.permissions.length} permission(s)
                        {d.expiresAt ? ` · expires ${new Date(d.expiresAt).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    {d.active ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-kazi-green/10 text-kazi-green">Active</Badge>
                        <Button variant="outline" size="sm" onClick={() => revoke(d.id)}>
                          Revoke
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
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
