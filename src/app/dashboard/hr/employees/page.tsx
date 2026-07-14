import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrEmployees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function EmployeesPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const employees = await db.query.hrEmployees.findMany({
    where: eq(hrEmployees.organizationId, ctx.organizationId),
    with: {
      department: { columns: { id: true, name: true } },
      position: { columns: { id: true, title: true } },
    },
    orderBy: [desc(hrEmployees.createdAt)],
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Employees</h1>
            <p className="text-muted-foreground mt-1">
              Manage your workforce
            </p>
          </div>
          <Link href="/dashboard/hr/employees/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {employees.map((employee) => (
            <Card key={employee.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{employee.firstName} {employee.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{employee.position?.title || "No position"}</p>
                    <p className="text-sm text-muted-foreground">{employee.department?.name || "No department"}</p>
                  </div>
                  <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                    {employee.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {employees.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No employees found. Add your first employee to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
