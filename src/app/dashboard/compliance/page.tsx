import { auth } from "@/lib/auth";
import { db } from "@/db";
import { etimsConfig, etimsInvoices, invoices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Shield, CheckCircle, XCircle, Clock, Settings, AlertTriangle } from "lucide-react";

async function getComplianceStats(userId: string) {
  const [config, etimsRecords] = await Promise.all([
    db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.userId, userId),
    }),
    db.query.etimsInvoices.findMany({
      where: eq(etimsInvoices.userId, userId),
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
  ]);

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
  };
}

export default async function CompliancePage() {
  const session = await auth();
  const stats = await getComplianceStats(session!.user!.id);

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">KRA eTIMS Compliance</h1>
            <p className="text-muted-foreground mt-1">
              Manage your tax invoice compliance with KRA
            </p>
          </div>
          <Link href="/dashboard/compliance/config">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Button>
          </Link>
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
                  <div className="text-2xl font-bold text-kazi-green">{stats.validated}</div>
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
                  <div className="text-2xl font-bold text-kazi-orange">{stats.pending}</div>
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
                  <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
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
                        <Badge variant={record.status === "validated" ? "success" : record.status === "pending" ? "warning" : "destructive"} className="capitalize">
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
