import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrAttendanceRecords } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function AttendancePage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const records = await db.query.hrAttendanceRecords.findMany({
    where: eq(hrAttendanceRecords.organizationId, ctx.organizationId),
    with: {
      employee: { columns: { id: true, firstName: true, lastName: true, employeeNumber: true } },
    },
    orderBy: [desc(hrAttendanceRecords.date)],
    limit: 50,
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Attendance</h1>
            <p className="text-muted-foreground mt-1">
              Track employee attendance
            </p>
          </div>
          <Link href="/dashboard/hr/attendance/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Record Attendance
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{(record.employee as any)?.firstName} {(record.employee as any)?.lastName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                    {record.clockIn && (
                      <p className="text-sm text-muted-foreground">
                        In: {new Date(record.clockIn).toLocaleTimeString()}
                      </p>
                    )}
                    {record.clockOut && (
                      <p className="text-sm text-muted-foreground">
                        Out: {new Date(record.clockOut).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={record.status === "present" ? "default" : record.status === "absent" ? "destructive" : "secondary"}>
                    {record.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {records.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No attendance records found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
