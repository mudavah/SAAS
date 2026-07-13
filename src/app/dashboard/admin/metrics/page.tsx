import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { MetricsDashboard } from "./metrics-dashboard";

export const dynamic = "force-dynamic";

/** Admin-only metrics dashboard. Server-enforces the owner/administrator
 *  role before rendering the (poll-based) client view. */
export default async function AdminMetricsPage() {
  const session = await auth();
  const role = (session?.user as { roleType?: string } | undefined)?.roleType;

  if (role !== "owner" && role !== "administrator") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell>
      <MetricsDashboard />
    </DashboardShell>
  );
}
