import { redirect } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

async function getHistoryData(organizationId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/submissions`,
    { headers: { "x-organization-id": organizationId }, next: { revalidate: 0 } }
  );
  if (!res.ok) return { counts: {}, trend: [] };
  return res.json();
}

export default async function ComplianceHistoryPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");
  const data = await getHistoryData(ctx.organizationId);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Submission History</h1>
          <p className="text-muted-foreground">
            Full submission history with filters.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input type="date" id="dateFrom" name="dateFrom" />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input type="date" id="dateTo" name="dateTo" />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="validated">Validated</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Apply
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.trend || data.trend.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No submission history available yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.trend.map((t: any) => (
                  <div
                    key={t.month}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">{t.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.successRate}% success rate
                      </p>
                    </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
