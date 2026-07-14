import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrDepartments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DepartmentsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const departments = await db.query.hrDepartments.findMany({
    where: eq(hrDepartments.organizationId, ctx.organizationId),
    with: {
      parent: { columns: { id: true, name: true } },
      _count: { select: { employees: true, positions: true } },
    },
    orderBy: [desc(hrDepartments.createdAt)],
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Departments</h1>
            <p className="text-muted-foreground mt-1">
              Manage organizational structure
            </p>
          </div>
          <Link href="/dashboard/hr/departments/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground">{dept.description || "No description"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dept._count?.employees || 0} employees · {dept._count?.positions || 0} positions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {departments.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No departments found. Add your first department to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
