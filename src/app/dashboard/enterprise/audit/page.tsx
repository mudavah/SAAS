"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";

export default function EnterpriseAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("enterprise");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/enterprise/audit?category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Enterprise Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of enterprise-scoped administrative actions.
          </p>
        </div>

        <div className="flex gap-2">
          {["enterprise", "branch", "compliance", "subscription"].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-md text-sm border ${
                category === c ? "bg-kazi-blue/10 border-kazi-blue" : "border-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-kazi-orange" /> Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit events.</div>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-start justify-between border-b pb-2 text-sm">
                    <div>
                      <div className="font-medium">{l.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.description}
                        {l.user ? ` · ${l.user.name || l.user.email}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{l.category}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(l.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
