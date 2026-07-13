"use client";

import { WifiOff, Wifi, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SyncStatus = "online" | "offline" | "syncing" | "error";

interface OfflineBannerProps {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: number | null;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function OfflineBanner({
  status,
  pendingCount,
  lastSyncAt,
  error,
  onRetry,
  className,
}: OfflineBannerProps) {
  const isOffline = status === "offline";
  const isSyncing = status === "syncing";
  const isError = status === "error";

  if (status === "online" && pendingCount === 0) {
    return null;
  }

  const formatLastSync = () => {
    if (!lastSyncAt) return "Never";
    const date = new Date(lastSyncAt);
    return date.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3",
        isOffline && "border-yellow-200 bg-yellow-50 text-yellow-800",
        isSyncing && "border-blue-200 bg-blue-50 text-blue-800",
        isError && "border-red-200 bg-red-50 text-red-800",
        !isOffline && !isSyncing && !isError && pendingCount > 0 && "border-orange-200 bg-orange-50 text-orange-800",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isOffline && <WifiOff className="h-5 w-5" />}
        {isSyncing && <Loader2 className="h-5 w-5 animate-spin" />}
        {isError && <AlertTriangle className="h-5 w-5" />}
        {status === "online" && pendingCount > 0 && <RefreshCw className="h-5 w-5" />}
        {status === "online" && pendingCount === 0 && <Wifi className="h-5 w-5" />}

        <div className="flex flex-col">
          <span className="font-medium">
            {isOffline && "You are offline"}
            {isSyncing && "Syncing changes..."}
            {isError && "Sync error"}
            {status === "online" && pendingCount > 0 && `${pendingCount} changes pending`}
            {status === "online" && pendingCount === 0 && "All changes synced"}
          </span>
          <span className="text-xs opacity-75">
            {isOffline && "Changes will sync when you reconnect"}
            {isSyncing && "Please wait..."}
            {isError && error}
            {status === "online" && `Last synced: ${formatLastSync()}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOffline && (
          <Badge variant="warning" className="text-xs">
            Offline
          </Badge>
        )}
        {isSyncing && (
          <Badge variant="info" className="text-xs">
            Syncing
          </Badge>
        )}
        {isError && (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )}
        {status === "online" && pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pendingCount} pending
          </Badge>
        )}

        {onRetry && (isOffline || isError) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
