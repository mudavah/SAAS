import { redirect } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

async function getSubmissionsData(organizationId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/submissions`,
    { headers: { "x-organization-id": organizationId }, next: { revalidate: 0 } }
  );
  if (!res.ok) return { counts: {}, successRate: 0 };
  return res.json();
}

async function getRetryResults(organizationId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/submissions/retry`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({ recordIds: [] }),
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function ComplianceSubmissionsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");
  const data = await getSubmissionsData(ctx.organizationId);

  const retryResult = await getRetryResults(ctx.organizationId);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Submissions</h1>
            <p className="text-muted-foreground">
              Failed submission queue and retry controls.
            </p>
          </div>
          <form
            action={`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/submissions/retry`}
            method="POST"
          >
            <input type="hidden" name="organizationId" value={ctx.organizationId} />
            <Button type="submit" variant="kazi" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry All Failed
            </Button>
          </form>
        </div>

        {retryResult && (
          <Card>
            <CardHeader>
              <CardTitle>Latest Retry Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Total: {retryResult.total} • Succeeded: {retryResult.succeeded} • Failed:{" "}
                  {retryResult.failed}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.counts.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Validated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-green">
                {data.counts.validated || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-orange">
                {data.counts.pending || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {data.counts.failed || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Success Rate</span>
                  <span className="font-medium">{data.successRate || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-kazi-green h-2 rounded-full"
                    style={{ width: `${data.successRate || 0}%` }}
                  />
                </div>
              </div>

              {data.failureReasons && data.failureReasons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Failure Reasons</p>
                  <div className="space-y-2">
                    {data.failureReasons.map((reason: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{reason.reason}</span>
                        <Badge variant="destructive">{reason.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.trend && data.trend.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Trend (Last {data.trend.length} Months)</p>
                  <div className="space-y-2">
                    {data.trend.map((t: any) => (
                      <div
                        key={t.month}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{t.month}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{t.total} total</Badge>
                          <Badge variant="success">{t.validated} validated</Badge>
                          {t.failed > 0 && (
                            <Badge variant="destructive">{t.failed} failed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
