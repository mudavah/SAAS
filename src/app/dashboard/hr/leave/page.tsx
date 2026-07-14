import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrLeaveRequests, hrEmployees } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function LeavePage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const leaveRequests = await db.query.hrLeaveRequests.findMany({
    where: eq(hrLeaveRequests.organizationId, ctx.organizationId),
    with: {
      employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } },
    },
    orderBy: [desc(hrLeaveRequests.createdAt)],
  });

  const pendingCount = leaveRequests.filter((r) => r.status === "pending").length;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground mt-1">
              {pendingCount} pending requests
            </p>
          </div>
          <Link href="/dashboard/hr/leave/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {leaveRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {(request.employee as any)?.firstName} {(request.employee as any)?.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {request.leaveType} · {request.days} days
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                    {request.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {leaveRequests.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No leave requests found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
