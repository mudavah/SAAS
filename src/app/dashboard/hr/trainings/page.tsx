import { redirect } from "next/navigation";
import { db } from "@/db";
import { hrTrainings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TrainingsPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const trainings = await db.query.hrTrainings.findMany({
    where: eq(hrTrainings.organizationId, ctx.organizationId),
    orderBy: [desc(hrTrainings.createdAt)],
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Training</h1>
            <p className="text-muted-foreground mt-1">
              Manage employee training programs
            </p>
          </div>
          <Link href="/dashboard/hr/trainings/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Create Training
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {trainings.map((training) => (
            <Card key={training.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{training.title}</h3>
                    <p className="text-sm text-muted-foreground">{training.description || "No description"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(training.startDate).toLocaleDateString()} - {new Date(training.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={training.status === "scheduled" ? "secondary" : training.status === "completed" ? "default" : "destructive"}>
                    {training.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {trainings.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No trainings found. Create your first training to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
