import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/sidebar";

export const dynamic = "force-dynamic";

interface MetricsSnapshot {
  uptimeSeconds: number;
  windowSeconds: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgApiLatencyMs: number;
  p95ApiLatencyMs: number;
  avgDbQueryTimeMs: number;
  activeUsers: number;
  generatedAt: string;
}

async function getMetrics(): Promise<MetricsSnapshot | null> {
  try {
    const res = await fetch("http://localhost:3000/api/admin/metrics", {
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function AdminMetricsPage() {
  const session = await auth();
  const role = (session?.user as { roleType?: string } | undefined)?.roleType;

  if (role !== "owner" && role !== "administrator") {
    redirect("/dashboard");
  }

  const data = await getMetrics();

  return (
    <DashboardShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">System Metrics</h1>
        {!data ? (
          <div className="text-red-500">Failed to load metrics</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Uptime" value={`${data.uptimeSeconds}s`} />
            <MetricCard label="Requests" value={String(data.requestCount)} />
            <MetricCard label="Errors" value={String(data.errorCount)} />
            <MetricCard
              label="Error Rate"
              value={`${(data.errorRate * 100).toFixed(1)}%`}
            />
            <MetricCard
              label="Avg API Latency"
              value={`${data.avgApiLatencyMs.toFixed(0)}ms`}
            />
            <MetricCard
              label="P95 API Latency"
              value={`${data.p95ApiLatencyMs.toFixed(0)}ms`}
            />
            <MetricCard
              label="Avg DB Query"
              value={`${data.avgDbQueryTimeMs.toFixed(0)}ms`}
            />
            <MetricCard label="Active Users" value={String(data.activeUsers)} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
