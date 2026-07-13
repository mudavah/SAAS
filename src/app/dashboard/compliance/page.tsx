import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  etimsConfig,
  etimsInvoices,
  invoices,
  complianceAlerts,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { getComplianceHealth } from "@/lib/compliance/engine";
import { listComplianceAlerts } from "@/lib/compliance/alerts";

async function getComplianceStats(organizationId: string) {
  const [config, etimsRecordsRaw, alerts] = await Promise.all([
    db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.organizationId, organizationId),
    }),
    db.query.etimsInvoices.findMany({
      where: eq(etimsInvoices.organizationId, organizationId),
      orderBy: (records) => [desc(records.createdAt)],
      limit: 5,
      with: {
        invoice: {
          with: {
            client: true,
          },
        },
      },
    }),
    listComplianceAlerts(organizationId, { unreadOnly: true }),
  ]);
  const etimsRecords = etimsRecordsRaw as any[];

  const totalInvoices = etimsRecords.length;
  const validated = etimsRecords.filter((r) => r.status === "validated").length;
  const pending = etimsRecords.filter((r) => r.status === "pending").length;
  const failed = etimsRecords.filter((r) => r.status === "failed").length;

  return {
    isConfigured: !!config && config.isActive,
    config,
    recentRecords: etimsRecords,
    totalInvoices,
    validated,
    pending,
    failed,
    unreadAlertCount: alerts.length,
  };
}

export default async function CompliancePage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");
  const stats = await getComplianceStats(ctx.organizationId);
  const health = stats.isConfigured
    ? await getComplianceHealth(ctx.organizationId)
    : null;

  const healthBadge =
    health && health.score === "excellent"
      ? { variant: "success" as const, label: "Excellent" }
      : health && health.score === "good"
      ? { variant: "default" as const, label: "Good" }
      : health && health.score === "fair"
      ? { variant: "warning" as const, label: "Fair" }
      : health && health.score === "poor"
      ? { variant: "destructive" as const, label: "Poor" }
      : null;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Compliance Center</h1>
            <p className="text-muted-foreground mt-1">
              Monitor your tax compliance health and manage eTIMS submissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {healthBadge && (
              <Badge variant={healthBadge.variant} className="text-sm">
                Health: {healthBadge.label}
              </Badge>
            )}
            <Link href="/dashboard/compliance/config">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </Link>
          </div>
        </div>

        {!stats.isConfigured ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-kazi-orange" />
                eTIMS Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Set up your KRA eTIMS integration to submit tax invoices automatically.
              </p>
              <Link href="/dashboard/compliance/config">
                <Button variant="kazi">Configure eTIMS</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {health && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-kazi-blue" />
                    Compliance Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-4xl font-bold">
                      {health.numericScore}
                      <span className="text-xl text-muted-foreground">/100</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">
                        {health.summary}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {health.factors.map((f, idx) => (
                          <Badge
                            key={idx}
                            variant={f.impact < 0 ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {f.label}: {f.impact > 0 ? "+" : ""}
                            {f.impact}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Submissions
                  </CardTitle>
                  <Shield className="h-4 w-4 text-kazi-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Validated
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-kazi-green" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-kazi-green">
                    {stats.validated}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending
                  </CardTitle>
                  <Clock className="h-4 w-4 text-kazi-orange" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-kazi-orange">
                    {stats.pending}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Failed
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {stats.failed}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Submissions</CardTitle>
                  <Link href="/dashboard/compliance/submissions">
                    <Button variant="ghost" size="sm">
                      View all
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {stats.recentRecords.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No eTIMS submissions yet. Submit an invoice to get started.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {record.invoice?.invoiceNumber || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.etimsInvoiceNumber || "—"}
                            </p>
                          </div>
                          <Badge
                            variant={
                              record.status === "validated"
                                ? "success"
                                : record.status === "pending"
                                ? "warning"
                                : "destructive"
                            }
                            className="capitalize"
                          >
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Active Alerts</CardTitle>
                  <Link href="/dashboard/compliance/alerts">
                    <Button variant="ghost" size="sm">
                      View all
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {stats.unreadAlertCount === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No active alerts. Great job!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Unread alerts
                        </span>
                        <Badge variant="destructive">
                          {stats.unreadAlertCount}
                        </Badge>
                      </div>
                      <Link href="/dashboard/compliance/alerts">
                        <Button variant="outline" className="w-full">
                          Review Alerts
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
