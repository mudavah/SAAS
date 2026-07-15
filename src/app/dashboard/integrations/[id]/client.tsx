"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/dashboard/integrations/HealthIndicator";
import { SendMessageForm } from "@/components/dashboard/integrations/SendMessageForm";
import { getCatalogEntry } from "@/lib/integrations/catalog";
import {
  CATEGORY_META,
  STATUS_COLORS,
  type Integration,
} from "@/components/dashboard/integrations/types";
import {
  TestTube,
  Unplug,
  Save,
  ExternalLink,
  Power,
  PowerOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface IntegrationDetailClientProps {
  integration: Integration;
}

export default function IntegrationDetailClient({
  integration,
}: IntegrationDetailClientProps) {
  const router = useRouter();
  const catalog = getCatalogEntry(integration.provider);
  const meta = CATEGORY_META[integration.category];
  const Icon = meta?.icon;

  const [name, setName] = useState(integration.name);
  const [enabled, setEnabled] = useState(integration.enabled);
  const [environment, setEnvironment] = useState(integration.environment);
  const [config, setConfig] = useState<Record<string, unknown>>(
    integration.config ?? {}
  );
  const [credentials, setCredentials] = useState<Record<string, unknown>>({});
  const [healthStatus, setHealthStatus] = useState(integration.healthStatus);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [notice, setNotice] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const configFields = catalog?.configFields ?? [];
  const secretFields = catalog?.secretFields ?? [];

  const setField = (
    store: "config" | "credentials",
    key: string,
    value: unknown
  ) => {
    if (store === "config") setConfig((p) => ({ ...p, [key]: value }));
    else setCredentials((p) => ({ ...p, [key]: value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enabled, environment, config, credentials }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setNotice({ ok: true, message: "Configuration saved." });
      router.refresh();
    } catch (err) {
      setNotice({
        ok: false,
        message: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/integrations/${integration.id}/test`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Test failed");
      setHealthStatus(data?.status ?? "unknown");
      setNotice({
        ok: data?.ok ?? false,
        message:
          data?.message ||
          `Test ${data?.ok ? "passed" : "failed"} (${data?.latencyMs ?? "?"} ms)`,
      });
    } catch (err) {
      setHealthStatus("down");
      setNotice({
        ok: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect this integration? This cannot be undone.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to disconnect");
      }
      router.push("/dashboard/integrations");
    } catch (err) {
      setDisconnecting(false);
      setNotice({
        ok: false,
        message: err instanceof Error ? err.message : "Failed to disconnect",
      });
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-kazi-green/10 text-kazi-green">
              {Icon && <Icon className="h-5 w-5" />}
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{name}</h1>
              <p className="text-sm text-muted-foreground">
                {integration.provider} · {integration.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HealthBadge status={healthStatus} />
            <Badge variant="secondary" className={STATUS_COLORS[integration.status]}>
              {integration.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="kazi" onClick={test} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>

          {integration.authType === "oauth2" &&
            integration.status !== "connected" && (
              <a href={`/api/integrations/${integration.id}/oauth/connect`}>
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Authorize (OAuth)
                </Button>
              </a>
            )}

          <Button
            variant="outline"
            onClick={() => setEnabled((v) => !v)}
          >
            {enabled ? (
              <Power className="mr-2 h-4 w-4" />
            ) : (
              <PowerOff className="mr-2 h-4 w-4" />
            )}
            {enabled ? "Enabled" : "Disabled"}
          </Button>

          <Button
            variant="destructive"
            onClick={disconnect}
            disabled={disconnecting}
          >
            <Unplug className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>

        {notice && (
          <p
            className={
              notice.ok
                ? "text-sm text-green-700 rounded-md bg-green-100 p-3 flex items-center gap-2"
                : "text-sm text-destructive rounded-md bg-destructive/10 p-3 flex items-center gap-2"
            }
          >
            {notice.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {notice.message}
          </p>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </div>

                {configFields.length > 0 ? (
                  configFields.map((f) => (
                    <div key={f.key}>
                      <label className="text-sm font-medium">{f.label}</label>
                      <input
                        type={f.type === "password" ? "password" : "text"}
                        value={String(config[f.key] ?? "")}
                        onChange={(e) => setField("config", f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                  ))
                ) : (
                  Object.keys(config).length > 0 && (
                    <div className="space-y-3 rounded-lg border p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Settings
                      </p>
                      {Object.keys(config).map((key) => (
                        <div key={key}>
                          <label className="text-sm font-medium capitalize">
                            {key}
                          </label>
                          <input
                            value={String(config[key] ?? "")}
                            onChange={(e) =>
                              setField("config", key, e.target.value)
                            }
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )
                )}

                {secretFields.length > 0 && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Credentials (leave blank to keep current)
                    </p>
                    {secretFields.map((f) => (
                      <div key={f.key}>
                        <label className="text-sm font-medium">{f.label}</label>
                        <input
                          type="password"
                          value={String(credentials[f.key] ?? "")}
                          onChange={(e) =>
                            setField("credentials", f.key, e.target.value)
                          }
                          placeholder="••••••••"
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button type="submit" variant="kazi" className="w-full" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
              </form>
            </CardContent>
          </Card>

          {(integration.category === "email" ||
            integration.category === "sms" ||
            integration.category === "whatsapp" ||
            integration.category === "push") && (
            <SendMessageForm
              integrationId={integration.id}
              category={integration.category}
            />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
