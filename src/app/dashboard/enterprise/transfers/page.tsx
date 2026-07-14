"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Truck, Plus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_transit: "bg-blue-100 text-blue-700",
  received: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/enterprise/transfers")
      .then((r) => r.json())
      .then((data) => { setTransfers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inter-Branch Transfers</h1>
            <p className="text-muted-foreground mt-1">Move inventory between branches</p>
          </div>
          <Button variant="kazi" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No transfers yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium">Number</th>
                      <th className="text-left p-3 font-medium">From</th>
                      <th className="text-left p-3 font-medium">To</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t: any) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-mono text-xs">{t.transferNumber}</td>
                        <td className="p-3">{t.fromBranch?.name || t.fromBranchId}</td>
                        <td className="p-3">{t.toBranch?.name || t.toBranchId}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={STATUS_COLORS[t.status]}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <BottomSheet open={open} onOpenChange={setOpen} title="New Transfer">
          <form action="/api/enterprise/transfers" method="POST" className="space-y-4">
            <div>
              <label className="text-sm font-medium">From Branch</label>
              <select name="fromBranchId" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select branch</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">To Branch</label>
              <select name="toBranchId" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select branch</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea name="notes" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <Button type="submit" variant="kazi" className="w-full">Create Transfer</Button>
          </form>
        </BottomSheet>
      </div>
    </DashboardShell>
  );
}
