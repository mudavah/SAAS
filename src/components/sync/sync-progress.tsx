"use client";

import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncPhase } from "@/hooks/use-sync-status";

interface SyncProgressProps {
  phase: SyncPhase;
  uploaded: number;
  downloaded: number;
  total: number;
  message: string;
  className?: string;
}

const PHASE_CONFIG: Record<SyncPhase, { icon: React.ReactNode; label: string; color: string }> = {
  idle: {
    icon: null,
    label: "Idle",
    color: "bg-gray-200",
  },
  uploading: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Uploading",
    color: "bg-blue-500",
  },
  downloading: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Downloading",
    color: "bg-blue-500",
  },
  conflict: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Conflicts",
    color: "bg-yellow-500",
  },
  completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Completed",
    color: "bg-green-500",
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Error",
    color: "bg-red-500",
  },
};

export function SyncProgress({
  phase,
  uploaded,
  downloaded,
  total,
  message,
  className,
}: SyncProgressProps) {
  const config = PHASE_CONFIG[phase] ?? PHASE_CONFIG.idle;

  const progressValue = total > 0 ? Math.round(((uploaded + downloaded) / total) * 100) : 0;

  const isActive = phase === "uploading" || phase === "downloading";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>

      {isActive && total > 0 && (
        <div className="space-y-1">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploaded: {uploaded}</span>
            <span>Downloaded: {downloaded}</span>
            <span>Total: {total}</span>
          </div>
        </div>
      )}

      {phase === "completed" && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Sync completed successfully</span>
        </div>
      )}

      {phase === "conflict" && (
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span>Conflicts detected. Please resolve them to complete sync.</span>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span>Sync failed. Please try again.</span>
        </div>
      )}

      {phase === "idle" && total > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          <span>{total} changes pending sync</span>
        </div>
      )}
    </div>
  );
}
