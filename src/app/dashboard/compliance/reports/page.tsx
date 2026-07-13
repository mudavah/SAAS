import { redirect } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";

async function getComplianceStats(organizationId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/reports`,
    { headers: { "x-organization-id": organizationId }, next: { revalidate: 0 } }
  );
  if (!res.ok) return { reports: [] };
  return res.json();
}

export default async function ComplianceReportsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");
  const data = await getComplianceStats(ctx.organizationId);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tax Reports</h1>
          <p className="text-muted-foreground">Generate and review VAT summaries.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/reports`}
              method="POST"
              className="flex flex-col sm:flex-row gap-4"
            >
              <input type="hidden" name="organizationId" value={ctx.organizationId} />
              <div className="flex-1 space-y-2">
                <Label htmlFor="type">Report Type</Label>
                <Select name="type" required defaultValue="monthly">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly VAT</SelectItem>
                    <SelectItem value="quarterly">Quarterly VAT</SelectItem>
                    <SelectItem value="annual">Annual VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="periodStart">Period Start</Label>
                <Input
                  type="date"
                  name="periodStart"
                  required
                  defaultValue={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="periodEnd">Period End</Label>
                <Input
                  type="date"
                  name="periodEnd"
                  required
                  defaultValue={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="kazi">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.reports || data.reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reports generated yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {report.type} Report
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.periodStart).toLocaleDateString("en-KE")} —{" "}
                        {new Date(report.periodEnd).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === "generated" ? "success" : "warning"}>
                        {report.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
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
