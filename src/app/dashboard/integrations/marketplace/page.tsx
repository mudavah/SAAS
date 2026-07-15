"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Store, CheckCircle2, Plus } from "lucide-react";
import {
  CATEGORY_META,
  CATEGORIES,
  type MarketplaceEntry,
} from "@/components/dashboard/integrations/types";
import { ConnectModal } from "@/components/dashboard/integrations/ConnectModal";

function MarketplaceInner() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<MarketplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(
    searchParams.get("category") || "all"
  );
  const [selected, setSelected] = useState<MarketplaceEntry | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/integrations/marketplace")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data?.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesCategory = category === "all" || e.category === category;
      const matchesQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [entries, query, category]);

  const openConnect = (entry: MarketplaceEntry) => {
    setSelected(entry);
    setConnectOpen(true);
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              Browse and connect integrations to extend KaziFlow.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search integrations…"
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading marketplace…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No integrations match your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entry) => {
              const meta = CATEGORY_META[entry.category];
              const Icon = meta?.icon;
              return (
                <Card key={entry.id} className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 truncate">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-kazi-green/10 text-kazi-green shrink-0">
                          {Icon && <Icon className="h-4 w-4" />}
                        </span>
                        <span className="truncate">{entry.name}</span>
                      </span>
                      {entry.connected && (
                        <Badge variant="success" className="shrink-0">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground flex-1">
                      {entry.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="capitalize">
                        {entry.category}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {entry.authType}
                      </Badge>
                    </div>
                    {entry.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a href={`/dashboard/integrations/${entry.integration?.id}`}>
                          Manage
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="kazi"
                        size="sm"
                        className="w-full"
                        onClick={() => openConnect(entry)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConnectModal
        open={connectOpen}
        onOpenChange={setConnectOpen}
        entry={selected}
        onConnected={() => {
          fetch("/api/integrations/marketplace")
            .then((r) => r.json())
            .then((data) => setEntries(data?.data ?? []))
            .catch(() => {});
        }}
      />
    </DashboardShell>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <MarketplaceInner />
    </Suspense>
  );
}
