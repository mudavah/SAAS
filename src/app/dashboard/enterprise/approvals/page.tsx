"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/enterprise/approvals/requests")
      .then((r) => r.json())
      .then((data) => { setRequests(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Branch Approvals</h1>
          <p className="text-muted-foreground mt-1">Manage branch approval workflows and requests</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No pending approvals</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Resource</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-medium">{r.title}</td>
                        <td className="p-3 capitalize">{r.resourceType}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={STATUS_COLORS[r.status]}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {r.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="kazi" asChild>
                                <a href={`/api/enterprise/approvals/requests/${r.id}/approve`} className="text-xs">Approve</a>
                              </Button>
                              <Button size="sm" variant="destructive" asChild>
                                <a href={`/api/enterprise/approvals/requests/${r.id}/reject`} className="text-xs">Reject</a>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
