"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { getCatalogEntry, type CatalogField } from "@/lib/integrations/catalog";
import type { MarketplaceEntry } from "./types";

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: MarketplaceEntry | null;
  onConnected?: (integration: unknown) => void;
}

export function ConnectModal({
  open,
  onOpenChange,
  entry,
  onConnected,
}: ConnectModalProps) {
  const catalog = entry ? getCatalogEntry(entry.id) : undefined;
  const configFields = catalog?.configFields ?? [];
  const secretFields = catalog?.secretFields ?? [];

  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [credentials, setCredentials] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) return null;

  const setField = (
    store: "config" | "credentials",
    key: string,
    value: unknown
  ) => {
    if (store === "config") setConfig((p) => ({ ...p, [key]: value }));
    else setCredentials((p) => ({ ...p, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: entry.id,
          name: entry.name,
          category: entry.category,
          authType: entry.authType,
          environment: (config.env as string) || "production",
          config,
          credentials,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to connect integration");
      }
      setConfig({});
      setCredentials({});
      onOpenChange(false);
      onConnected?.(data?.data ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    store: "config" | "credentials",
    field: CatalogField
  ) => {
    const value =
      (store === "config" ? config[field.key] : credentials[field.key]) ?? "";
    const update = (v: unknown) => setField(store, field.key, v);

    return (
      <div key={`${store}.${field.key}`}>
        <label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </label>
        {field.type === "select" ? (
          <select
            value={String(value)}
            required={field.required}
            onChange={(e) => update(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : field.type === "boolean" ? (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => update(e.target.checked)}
            className="mt-2 h-4 w-4"
          />
        ) : (
          <input
            type={field.type === "password" ? "password" : field.type}
            value={String(value)}
            required={field.required}
            placeholder={field.placeholder}
            onChange={(e) => update(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        )}
        {field.help && (
          <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
        )}
      </div>
    );
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Connect ${entry.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">{entry.description}</p>

        {configFields.length > 0 && (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Configuration
            </p>
            {configFields.map((f) => renderField("config", f))}
          </div>
        )}

        {secretFields.length > 0 && (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Credentials
            </p>
            {secretFields.map((f) => renderField("credentials", f))}
          </div>
        )}

        {catalog?.authType === "oauth2" && secretFields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This integration uses OAuth. After saving we will redirect you to{" "}
            {entry.name} to authorize access.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 p-2">
            {error}
          </p>
        )}

        <Button type="submit" variant="kazi" className="w-full" disabled={saving}>
          {saving ? "Connecting…" : "Connect"}
        </Button>
        <a
          href={entry.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-xs text-muted-foreground hover:underline"
        >
          View documentation
        </a>
      </form>
    </BottomSheet>
  );
}
