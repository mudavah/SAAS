import { redirect } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

async function getAlertsData(organizationId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/alerts`,
    { headers: { "x-organization-id": organizationId }, next: { revalidate: 0 } }
  );
  if (!res.ok) return { alerts: [] };
  return res.json();
}

export default async function ComplianceAlertsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");
  const data = await getAlertsData(ctx.organizationId);
  const alerts = data.alerts || [];

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-kazi-orange" />;
      default:
        return <Info className="h-4 w-4 text-kazi-blue" />;
    }
  };

  const severityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Compliance Alerts</h1>
          <p className="text-muted-foreground">
            Review and manage compliance alerts and warnings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {alerts.filter((a: any) => a.severity === "critical").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-orange">
                {alerts.filter((a: any) => a.severity === "warning").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-green">
                {alerts.filter((a: any) => a.resolved).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="mx-auto h-12 w-12 text-kazi-green mb-3" />
                <p className="text-muted-foreground">No active alerts. You're all set!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-start gap-3">
                      {severityIcon(alert.severity)}
                      <div>
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.createdAt).toLocaleDateString("en-KE")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {!alert.read && (
                        <Badge variant="outline">Unread</Badge>
                      )}
                    </div>
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
