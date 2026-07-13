import { redirect } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { ensureDefaultCalendar } from "@/lib/compliance/calendar";

async function getCalendarData(organizationId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/compliance/calendar`,
    { headers: { "x-organization-id": organizationId }, next: { revalidate: 0 } }
  );
  if (!res.ok) return { events: [] };
  return res.json();
}

export default async function ComplianceCalendarPage() {
  const ctx = await getPageContext();
  if (!ctx) redirect("/login");

  const data = await getCalendarData(ctx.organizationId);
  await ensureDefaultCalendar(ctx.organizationId, new Date().getFullYear());

  const today = new Date();
  const events = (data.events || []).sort(
    (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tax Calendar</h1>
            <p className="text-muted-foreground">
              Track upcoming tax deadlines and obligations.
            </p>
          </div>
          <Button variant="kazi" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter((e: any) => !e.completed && new Date(e.dueDate) >= today).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {events.filter((e: any) => !e.completed && new Date(e.dueDate) < today).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-kazi-green">
                {events.filter((e: any) => e.completed).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No calendar events. Default statutory events will be created automatically.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((event: any) => {
                  const due = new Date(event.dueDate);
                  const overdue = !event.completed && due < today;
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays
                          className={`h-5 w-5 ${overdue ? "text-destructive" : "text-kazi-blue"}`}
                        />
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {due.toLocaleDateString("en-KE")} • {event.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {overdue && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        )}
                        {event.completed && (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        )}
                        {!event.completed && !overdue && (
                          <Badge variant="warning">Upcoming</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
