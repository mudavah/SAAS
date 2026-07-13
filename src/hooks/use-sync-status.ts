"use client";

import { useState, useEffect, useCallback } from "react";
import { getSyncState, performBackgroundSync } from "@/lib/sync/engine";
import { getPendingCount } from "@/lib/offline/queue";

export type SyncPhase = "idle" | "uploading" | "downloading" | "conflict" | "completed" | "error";

export interface SyncProgress {
  phase: SyncPhase;
  uploaded: number;
  downloaded: number;
  total: number;
  message: string;
  error?: string;
}

export function useSyncStatus(refreshInterval = 5000) {
  const [progress, setProgress] = useState<SyncProgress>({
    phase: "idle",
    uploaded: 0,
    downloaded: 0,
    total: 0,
    message: "Ready",
  });

  const refresh = useCallback(async () => {
    const state = await getSyncState();
    const pendingCount = await getPendingCount();

    setProgress((prev) => ({
      ...prev,
      total: pendingCount,
      message: pendingCount === 0 ? "All changes synced" : `${pendingCount} pending`,
    }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  const triggerSync = useCallback(async (): Promise<SyncProgress> => {
    setProgress((prev) => ({
      ...prev,
      phase: "uploading",
      uploaded: 0,
      downloaded: 0,
      message: "Uploading changes...",
      error: undefined,
    }));

    try {
      const pendingCount = await getPendingCount();
      setProgress((prev) => ({
        ...prev,
        total: pendingCount,
      }));

      const result = await performBackgroundSync();

      if (result.errors.length > 0) {
        setProgress((prev) => ({
          ...prev,
          phase: "error",
          message: "Sync completed with errors",
          error: result.errors[0],
        }));
        return progress;
      }

      if (result.conflicts.length > 0) {
        setProgress((prev) => ({
          ...prev,
          phase: "conflict",
          uploaded: result.pushed,
          message: `${result.conflicts.length} conflicts need resolution`,
        }));
        return progress;
      }

      setProgress((prev) => ({
        ...prev,
        phase: "downloading",
        uploaded: result.pushed,
        message: "Downloading changes...",
      }));

      await new Promise((resolve) => setTimeout(resolve, 500));

      setProgress((prev) => ({
        ...prev,
        phase: "completed",
        uploaded: result.pushed,
        downloaded: result.pulled,
        message: "Sync completed",
      }));

      await refresh();

      return progress;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      setProgress((prev) => ({
        ...prev,
        phase: "error",
        message,
        error: message,
      }));
      return progress;
    }
  }, [refresh, progress]);

  const reset = useCallback(() => {
    setProgress({
      phase: "idle",
      uploaded: 0,
      downloaded: 0,
      total: 0,
      message: "Ready",
    });
  }, []);

  return {
    progress,
    triggerSync,
    refresh,
    reset,
  };
}
