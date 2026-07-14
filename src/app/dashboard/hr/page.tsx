import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrEmployees, hrLeaveRequests, hrDepartments, hrApplicants, hrTrainings } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Users, UserCheck, FileText, GraduationCap, Building2, UserPlus } from "lucide-react";

async function getHrStats(organizationId: string) {
  const [totalEmployees, activeEmployees, pendingLeave, totalDepartments, totalApplicants, activeTrainings] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(hrEmployees).where(eq(hrEmployees.organizationId, organizationId)),
    db.select({ count: sql<number>`count(*)` }).from(hrEmployees).where(and(eq(hrEmployees.organizationId, organizationId), eq(hrEmployees.status, "active"))),
    db.select({ count: sql<number>`count(*)` }).from(hrLeaveRequests).where(and(eq(hrLeaveRequests.organizationId, organizationId), eq(hrLeaveRequests.status, "pending"))),
    db.select({ count: sql<number>`count(*)` }).from(hrDepartments).where(eq(hrDepartments.organizationId, organizationId)),
    db.select({ count: sql<number>`count(*)` }).from(hrApplicants).where(eq(hrApplicants.organizationId, organizationId)),
    db.select({ count: sql<number>`count(*)` }).from(hrTrainings).where(and(eq(hrTrainings.organizationId, organizationId), eq(hrTrainings.status, "scheduled"))),
  ]);

  return {
    totalEmployees: totalEmployees[0]?.count ?? 0,
    activeEmployees: activeEmployees[0]?.count ?? 0,
    pendingLeave: pendingLeave[0]?.count ?? 0,
    totalDepartments: totalDepartments[0]?.count ?? 0,
    totalApplicants: totalApplicants[0]?.count ?? 0,
    activeTrainings: activeTrainings[0]?.count ?? 0,
  };
}

export default async function HrDashboardPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");
  const stats = await getHrStats(ctx.organizationId);

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Human Resources</h1>
            <p className="text-muted-foreground mt-1">
              Manage employees, attendance, leave, and recruitment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/dashboard/hr/employees">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </CardTitle>
                <Users className="h-4 w-4 text-kazi-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.activeEmployees} active</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/hr/departments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Departments
                </CardTitle>
                <Building2 className="h-4 w-4 text-kazi-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDepartments}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/hr/leave">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Leave
                </CardTitle>
                <FileText className="h-4 w-4 text-kazi-orange" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingLeave}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/hr/applicants">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Applicants
                </CardTitle>
                <UserPlus className="h-4 w-4 text-kazi-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalApplicants}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/hr/trainings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Trainings
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-kazi-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTrainings}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/hr/attendance">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Attendance
                </CardTitle>
                <UserCheck className="h-4 w-4 text-kazi-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Track</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
