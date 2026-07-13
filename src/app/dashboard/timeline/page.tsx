"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Search,
  FileText,
  CreditCard,
  Receipt,
  Users,
  Package,
  BookOpen,
  Shield,
  Sparkles,
  Bell,
  FileSearch,
  Wallet,
  Users2,
  RefreshCw,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TimelineUser = {
  id: string;
  name: string | null;
  email: string | null;
} | null;

type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: TimelineUser;
};

type TimelineResponse = {
  data: TimelineEvent[];
  nextCursor: number | null;
  total: number;
};

// Map an eventType (e.g. "invoice.created") to a UI group by its prefix.
type FilterKey =
  | "all"
  | "invoice"
  | "payment"
  | "expense"
  | "client"
  | "inventory"
  | "journal"
  | "subscription"
  | "team"
  | "notification"
  | "audit"
  | "compliance"
  | "ai";

const FILTERS: { key: FilterKey; label: string; prefixes: string[] }[] = [
  { key: "all", label: "All", prefixes: [] },
  { key: "invoice", label: "Invoices", prefixes: ["invoice"] },
  { key: "payment", label: "Payments", prefixes: ["payment"] },
  { key: "expense", label: "Expenses", prefixes: ["expense"] },
  { key: "client", label: "Clients", prefixes: ["client"] },
  { key: "inventory", label: "Inventory", prefixes: ["inventory"] },
  { key: "journal", label: "Bookkeeping", prefixes: ["journal"] },
  { key: "subscription", label: "Subscriptions", prefixes: ["subscription"] },
  { key: "team", label: "Team", prefixes: ["team"] },
  { key: "notification", label: "Notifications", prefixes: ["notification"] },
  { key: "audit", label: "Audit", prefixes: ["audit"] },
  { key: "compliance", label: "Compliance", prefixes: ["compliance"] },
  { key: "ai", label: "AI", prefixes: ["ai"] },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  invoice: FileText,
  payment: CreditCard,
  expense: Receipt,
  client: Users,
  inventory: Package,
  journal: BookOpen,
  subscription: Wallet,
  team: Users2,
  notification: Bell,
  audit: FileSearch,
  compliance: Shield,
  ai: Sparkles,
  system: Activity,
};

const CATEGORY_STYLES: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100",
  payment: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100",
  expense: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100",
  client: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-100",
  inventory: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100",
  journal: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-100",
  subscription: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100",
  team: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100",
  notification: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-100",
  audit: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100",
  compliance: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-100",
  ai: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-100",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100",
};

const POLL_INTERVAL_MS = 30_000;

function categoryOf(eventType: string): string {
  return eventType.split(".")[0] || "system";
}

function iconFor(eventType: string) {
  return CATEGORY_ICONS[categoryOf(eventType)] || Activity;
}

function styleFor(eventType: string): string {
  return CATEGORY_STYLES[categoryOf(eventType)] || CATEGORY_STYLES.system;
}

function humanEventType(eventType: string): string {
  return eventType
    .replace(/\./g, " · ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Group ordering helper.
const GROUP_ORDER = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];

function groupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "This Week";
  if (date >= startOfMonth) return "This Month";
  return "Earlier";
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtersRef = useRef({ filter, debouncedSearch, startDate, endDate });
  filtersRef.current = { filter, debouncedSearch, startDate, endDate };

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const buildParams = useCallback((page: number) => {
    const { filter, debouncedSearch, startDate, endDate } = filtersRef.current;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (filter !== "all") {
      const def = FILTERS.find((f) => f.key === filter);
      // The API filters on exact eventType; we filter by prefix client-side too,
      // but pass resourceType where it maps cleanly for a narrower query.
      if (def?.prefixes[0]) params.set("resourceType", def.prefixes[0]);
    }
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (startDate) params.set("startDate", new Date(startDate).toISOString());
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      params.set("endDate", end.toISOString());
    }
    return params;
  }, []);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await fetch(`/api/timeline?${buildParams(1)}`);
        if (!res.ok) return;
        const data: TimelineResponse = await res.json();
        setEvents(data.data);
        setNextCursor(data.nextCursor);
        setTotal(data.total);
      } catch {
        // network hiccup — keep existing data
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const loadMore = useCallback(async () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/timeline?${buildParams(nextCursor)}`);
      if (!res.ok) return;
      const data: TimelineResponse = await res.json();
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...data.data.filter((e) => !seen.has(e.id))];
      });
      setNextCursor(data.nextCursor);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildParams]);

  // Reload from page 1 whenever filters change.
  useEffect(() => {
    load();
  }, [filter, debouncedSearch, startDate, endDate, load]);

  // Poll for updates every 30s (page 1, silent).
  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Client-side group filtering by prefix (covers multiple event types per group).
  const activeFilter = FILTERS.find((f) => f.key === filter);
  const visible =
    filter === "all" || !activeFilter?.prefixes.length
      ? events
      : events.filter((e) =>
          activeFilter.prefixes.includes(categoryOf(e.eventType))
        );

  // Group visible events by date bucket, preserving server order (desc).
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const e of visible) {
    const label = groupLabel(e.createdAt);
    (grouped[label] ||= []).push(e);
  }
  const orderedGroups = GROUP_ORDER.filter((g) => grouped[g]?.length);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Business Timeline</h1>
            <p className="text-muted-foreground">
              {total > 0
                ? `${total} event${total > 1 ? "s" : ""} across your business`
                : "A unified feed of everything happening in your business"}
            </p>
          </div>
          <Button
            onClick={() => load()}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Search + date range */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search timeline..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto"
              aria-label="Start date"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto"
              aria-label="End date"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const Icon = f.key === "all" ? Activity : CATEGORY_ICONS[f.prefixes[0]] || Activity;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-kazi-green text-white border-kazi-green"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No timeline events found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {orderedGroups.map((group) => (
              <div key={group} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {group}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-2">
                  {grouped[group].map((event) => {
                    const Icon = iconFor(event.eventType);
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            styleFor(event.eventType)
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium break-words">{event.title}</p>
                            <Badge variant="secondary" className="text-xs">
                              {humanEventType(event.eventType)}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 break-words">
                              {event.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{formatTime(event.createdAt)}</span>
                            {event.user?.name && (
                              <span>by {event.user.name}</span>
                            )}
                            {event.resourceType && (
                              <span className="capitalize">
                                {event.resourceType.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {nextCursor != null && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
