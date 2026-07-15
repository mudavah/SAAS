"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IntegrationActivityLog } from "./types";

interface ActivityLogProps {
  logs: IntegrationActivityLog[];
  loading?: boolean;
  emptyMessage?: string;
}

function statusVariant(status: string) {
  switch (status) {
    case "success":
      return "border-transparent bg-green-100 text-green-700";
    case "failed":
    case "error":
      return "border-transparent bg-red-100 text-red-700";
    case "pending":
    case "queued":
      return "border-transparent bg-yellow-100 text-yellow-700";
    default:
      return "border-transparent bg-gray-100 text-gray-700";
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ActivityLog({
  logs,
  loading,
  emptyMessage = "No activity yet.",
}: ActivityLogProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading activity…
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm capitalize">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn("capitalize", statusVariant(log.status))}
                  >
                    {log.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.provider}
                  {log.message ? ` · ${log.message}` : ""}
                </p>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 sm:text-right">
                <div>{formatTime(log.createdAt)}</div>
                {typeof log.latencyMs === "number" && (
                  <div>{log.latencyMs} ms</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
