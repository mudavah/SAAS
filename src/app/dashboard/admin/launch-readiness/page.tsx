import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { getLaunchReadiness, type ReadinessCheck } from "@/lib/launch-readiness";

export const dynamic = "force-dynamic";

const GROUP_LABELS: Record<ReadinessCheck["group"], string> = {
  environment: "Environment",
  infrastructure: "Infrastructure",
  security: "Security",
  data: "Data",
  quality: "Quality",
};

const STATUS_STYLE: Record<ReadinessCheck["status"], { dot: string; text: string; label: string }> = {
  pass: { dot: "bg-green-500", text: "text-green-700 dark:text-green-400", label: "PASS" },
  warn: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", label: "WARN" },
  fail: { dot: "bg-red-500", text: "text-red-700 dark:text-red-400", label: "FAIL" },
  info: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400", label: "INFO" },
};

const OVERALL_STYLE = {
  ready: { label: "READY TO LAUNCH", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  "at-risk": { label: "AT RISK", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  blocked: { label: "BLOCKED", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
} as const;

export default async function LaunchReadinessPage() {
  const session = await auth();
  const role = (session?.user as { roleType?: string } | undefined)?.roleType;
  if (role !== "owner" && role !== "administrator") {
    redirect("/dashboard");
  }

  const data = await getLaunchReadiness();
  const overall = OVERALL_STYLE[data.overall];

  // Group checks by category for display.
  const groups = Array.from(
    new Set(data.checks.map((c) => c.group))
  ) as ReadinessCheck["group"][];

  return (
    <DashboardShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Launch Readiness</h1>
            <p className="text-sm text-muted-foreground">
              Generated {new Date(data.generatedAt).toLocaleString("en-KE")}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold ${overall.cls}`}>
            {overall.label} · {data.scorePct}%
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Uptime" value={`${data.metrics.uptimeSeconds}s`} />
          <Stat label="Requests" value={String(data.metrics.requestCount)} />
          <Stat label="Error Rate" value={`${(data.metrics.errorRate * 100).toFixed(2)}%`} />
          <Stat
            label="p95 Latency"
            value={`${data.metrics.p95ApiLatencyMs.toFixed(0)}ms`}
          />
          <Stat
            label="Alerts (C/W)"
            value={`${data.alerts.criticalCount} / ${data.alerts.warningCount}`}
          />
          <Stat label="Active Users" value={String(data.metrics.activeUsers)} />
          <Stat
            label="Env Required"
            value={data.env.ok ? "OK" : "MISSING"}
          />
          <Stat
            label="Cache"
            value={data.env.missingRecommended.includes("REDIS_URL") ? "in-mem" : "redis"}
          />
        </div>

        {groups.map((g) => (
          <section key={g} className="mb-6">
            <h2 className="text-lg font-semibold mb-2">{GROUP_LABELS[g]}</h2>
            <div className="border rounded-lg divide-y">
              {data.checks
                .filter((c) => c.group === g)
                .map((c) => {
                  const s = STATUS_STYLE[c.status];
                  return (
                    <div key={c.id} className="flex items-start gap-3 p-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${s.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.label}</span>
                          <span className={`text-xs font-semibold ${s.text}`}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.detail}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <p className="text-xs text-muted-foreground mt-4">
          Full reports: <code>docs/EPIC_12_PRODUCTION_READINESS_REPORT.md</code>,
          <code> docs/EPIC_12_LAUNCH_CHECKLIST.md</code>, and{" "}
          <code>docs/KAZIFLOW_V1_RELEASE_NOTES.md</code>.
        </p>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
