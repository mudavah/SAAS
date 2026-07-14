"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  suspended: "bg-red-100 text-red-700",
  closing: "bg-yellow-100 text-yellow-700",
};

export default function BranchDetailClient({ branch, members, pricing, taxes, performance }: any) {
  const [tab, setTab] = useState("overview");

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{branch.name}</h1>
            <p className="text-muted-foreground font-mono">{branch.code}</p>
          </div>
          <Badge variant="secondary" className={STATUS_COLORS[branch.status]}>
            {branch.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold capitalize">{branch.type.replace("_", " ")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{branch.currency}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Timezone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{branch.timezone}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{members?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="tax">Tax</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {branch.address && <p><strong>Address:</strong> {branch.address}</p>}
                {branch.city && <p><strong>City:</strong> {branch.city}</p>}
                {branch.country && <p><strong>Country:</strong> {branch.country}</p>}
                {branch.phone && <p><strong>Phone:</strong> {branch.phone}</p>}
                {branch.email && <p><strong>Email:</strong> {branch.email}</p>}
                {branch.taxId && <p><strong>Tax ID:</strong> {branch.taxId}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Branch Members</CardTitle>
              </CardHeader>
              <CardContent>
                {!members?.length ? (
                  <p className="text-sm text-muted-foreground">No members assigned</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium">{m.user?.name || m.user?.email || "Unknown"}</span>
                        <Badge variant="secondary">{m.roleType}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Branch Pricing Rules</CardTitle>
              </CardHeader>
              <CardContent>
                {!pricing?.length ? (
                  <p className="text-sm text-muted-foreground">No pricing rules configured</p>
                ) : (
                  <div className="space-y-2">
                    {pricing.map((p: any) => (
                      <div key={p.id} className="text-sm p-2 rounded bg-muted/30">
                        Adjustment: {p.priceAdjustmentValue} {p.priceAdjustmentType}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
              </CardHeader>
              <CardContent>
                {!taxes?.length ? (
                  <p className="text-sm text-muted-foreground">No tax rules configured</p>
                ) : (
                  <div className="space-y-2">
                    {taxes.map((t: any) => (
                      <div key={t.id} className="text-sm p-2 rounded bg-muted/30">
                        {t.taxName}: {t.rate}% ({t.taxType})
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance History</CardTitle>
              </CardHeader>
              <CardContent>
                {!performance?.length ? (
                  <p className="text-sm text-muted-foreground">No performance data yet</p>
                ) : (
                  <div className="space-y-2">
                    {performance.map((p: any) => (
                      <div key={p.id} className="text-sm p-2 rounded bg-muted/30 flex justify-between">
                        <span>{new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}</span>
                        <span className="font-medium">{p.revenue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
