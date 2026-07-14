import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrApplicants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ApplicantsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const applicants = await db.query.hrApplicants.findMany({
    where: eq(hrApplicants.organizationId, ctx.organizationId),
    with: {
      position: { columns: { id: true, title: true } },
      department: { columns: { id: true, name: true } },
    },
    orderBy: [desc(hrApplicants.createdAt)],
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Recruitment</h1>
            <p className="text-muted-foreground mt-1">
              Manage applicants and hiring pipeline
            </p>
          </div>
          <Link href="/dashboard/hr/applicants/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Add Applicant
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {applicants.map((applicant) => (
            <Card key={applicant.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{applicant.firstName} {applicant.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{(applicant.position as any)?.title || "No position"}</p>
                    <p className="text-sm text-muted-foreground">{(applicant.department as any)?.name || "No department"}</p>
                  </div>
                  <Badge variant={applicant.status === "hired" ? "default" : applicant.status === "rejected" ? "destructive" : "secondary"}>
                    {applicant.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {applicants.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No applicants found. Add your first applicant to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
