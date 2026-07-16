import { DashboardShell } from "@/components/dashboard/sidebar";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardShell>
      <PageSkeleton tableRows={6} tableCols={4} />
    </DashboardShell>
  );
}
