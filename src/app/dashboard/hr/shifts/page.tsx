import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrShifts, hrShiftAssignments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ShiftsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const shifts = await db.query.hrShifts.findMany({
    where: eq(hrShifts.organizationId, ctx.organizationId),
    with: {
      assignments: {
        where: eq(hrShiftAssignments.organizationId, ctx.organizationId),
        limit: 10,
        with: {
          employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        },
      },
    },
    orderBy: [desc(hrShifts.createdAt)],
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Shift Scheduling</h1>
            <p className="text-muted-foreground mt-1">
              Manage work shifts and assignments
            </p>
          </div>
          <Link href="/dashboard/hr/shifts/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Create Shift
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{shift.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {shift.startTime} - {shift.endTime}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shift.assignments?.length || 0} assignments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {shifts.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No shifts found. Create your first shift to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
