import { redirect } from "next/navigation";
import Link from "next/link";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Store,
  Activity,
  History,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { CategoryGrid } from "@/components/dashboard/integrations/CategoryGrid";
import { HealthIndicator } from "@/components/dashboard/integrations/HealthIndicator";
import { IntegrationCard } from "@/components/dashboard/integrations/IntegrationCard";
import {
  CATEGORY_META,
  CATEGORIES,
  HEALTH_COLORS,
  type Integration,
  type IntegrationCategorySummary,
} from "@/components/dashboard/integrations/types";

export default async function IntegrationsPage() {
  const ctx = await getPageContext({ requiredPermission: "integrations.view" });
  if (!ctx) throw new Error("Unauthorized");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/integrations`,
    { cache: "no-store" }
  );
  const payload = await res.json().catch(() => ({ data: [] }));
  const integrations: Integration[] = payload?.data ?? [];

  const total = integrations.length;
  const connected = integrations.filter((i) => i.status === "connected").length;

  const healthCounts = {
    healthy: integrations.filter((i) => i.healthStatus === "healthy").length,
    degraded: integrations.filter((i) => i.healthStatus === "degraded").length,
    down: integrations.filter((i) => i.healthStatus === "down").length,
    unknown: integrations.filter((i) => i.healthStatus === "unknown").length,
  };

  const categories: IntegrationCategorySummary[] = CATEGORIES.map((c) => {
    const items = integrations.filter((i) => i.category === c.value);
    return {
      category: c.value,
      label: c.label,
      count: items.length,
      connected: items.filter((i) => i.status === "connected").length,
    };
  });

  const quickLinks = [
    { href: "/dashboard/integrations/marketplace", label: "Marketplace", icon: Store },
    { href: "/dashboard/integrations/health", label: "Health", icon: Activity },
    { href: "/dashboard/integrations/activity", label: "Activity Log", icon: History },
  ];

  const healthSummary = [
    { key: "healthy" as const, count: healthCounts.healthy, icon: CheckCircle2 },
    { key: "degraded" as const, count: healthCounts.degraded, icon: AlertTriangle },
    { key: "down" as const, count: healthCounts.down, icon: XCircle },
    { key: "unknown" as const, count: healthCounts.unknown, icon: HelpCircle },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Integration Hub</h1>
            <p className="text-muted-foreground mt-1">
              Connect, monitor and manage your external services.
            </p>
          </div>
          <Link href="/dashboard/integrations/marketplace">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Browse Marketplace
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">{connected} connected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Healthy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-green">
                {healthCounts.healthy}
              </div>
              <HealthIndicator status="healthy" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Degraded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-orange">
                {healthCounts.degraded}
              </div>
              <HealthIndicator status="degraded" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Down
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {healthCounts.down}
              </div>
              <HealthIndicator status="down" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-kazi-green" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryGrid categories={categories} />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthSummary.map((h) => {
                const Icon = h.icon;
                return (
                  <div
                    key={h.key}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {HEALTH_COLORS[h.key].label}
                    </span>
                    <Badge
                      variant="secondary"
                      className={HEALTH_COLORS[h.key].badge}
                    >
                      {h.count}
                    </Badge>
                  </div>
                );
              })}
              <Link href="/dashboard/integrations/health" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Activity className="mr-2 h-4 w-4" />
                  Open Health Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              {quickLinks.map((q) => {
                const Icon = q.icon;
                return (
                  <Link key={q.href} href={q.href}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Icon className="mr-2 h-4 w-4" />
                      {q.label}
                    </Button>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Your Integrations</h2>
              <Link href="/dashboard/integrations/health">
                <Button variant="ghost" size="sm">
                  View health
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
