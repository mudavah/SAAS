import { getPageContext } from "@/lib/session";
import { db } from "@/db";
import { apiKeys, oauthClients, webhooks, apiSandboxSessions, apiUsage } from "@/db/schema";
import { and, eq, desc, count, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, AppWindow, Webhook, Play, Activity } from "lucide-react";
import Link from "next/link";

export default async function DeveloperDashboardPage() {
  const ctx = await getPageContext({ requiredPermission: "api.view" });
  if (!ctx) redirect("/login");

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalKeys,
    totalClients,
    totalWebhooks,
    totalSandboxSessions,
    recentUsage,
  ] = await Promise.all([
    db.select({ count: count() }).from(apiKeys).where(and(eq(apiKeys.organizationId, ctx.organizationId), eq(apiKeys.status, "active"))),
    db.select({ count: count() }).from(oauthClients).where(and(eq(oauthClients.organizationId, ctx.organizationId), eq(oauthClients.status, "active"))),
    db.select({ count: count() }).from(webhooks).where(and(eq(webhooks.organizationId, ctx.organizationId), eq(webhooks.status, "active"))),
    db.select({ count: count() }).from(apiSandboxSessions).where(eq(apiSandboxSessions.organizationId, ctx.organizationId)),
    db.select({ count: count() }).from(apiUsage).where(and(eq(apiUsage.organizationId, ctx.organizationId), gte(apiUsage.createdAt, sevenDaysAgo))),
  ]);

  const stats = [
    { label: "API Keys", value: totalKeys[0]?.count ?? 0, icon: Key, href: "/developer/keys", color: "text-blue-500" },
    { label: "OAuth Clients", value: totalClients[0]?.count ?? 0, icon: AppWindow, href: "/developer/oauth", color: "text-purple-500" },
    { label: "Webhooks", value: totalWebhooks[0]?.count ?? 0, icon: Webhook, href: "/developer/webhooks", color: "text-orange-500" },
    { label: "Sandbox Sessions", value: totalSandboxSessions[0]?.count ?? 0, icon: Play, href: "/developer/sandbox", color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Developer Portal</h1>
        <p className="text-muted-foreground">
          Manage APIs, integrations, and developer tools
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recent API Usage</h2>
        </div>
        <p className="text-3xl font-bold">{recentUsage[0]?.count ?? 0}</p>
        <p className="text-sm text-muted-foreground">Requests in the last 7 days</p>
      </Card>
    </div>
  );
}
