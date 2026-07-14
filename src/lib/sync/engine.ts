import { openDB, put, get, getAll, del } from "@/lib/offline/db";
import type {
  ConflictAction,
  ConflictContext,
  ConflictRecord,
  PendingOperation,
} from "@/lib/offline/schema";
import { enqueueOperation, getPendingOperations, updateOperationStatus, removeOperation } from "@/lib/offline/queue";
import {
  detectConflict,
  resolveConflictStrategy,
} from "./conflict";

function simpleChecksum(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `cs:${Math.abs(hash)}:${str.length}`;
}

export interface SyncState {
  lastSyncAt: number | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflicts: ConflictRecord[];
  error?: string;
}

export interface DeltaSyncResult {
  pushed: number;
  pulled: number;
  conflicts: ConflictRecord[];
  errors: string[];
}

function serializeRecord(record: Record<string, unknown>): string {
  return JSON.stringify(record);
}

export async function getSyncState(): Promise<SyncState> {
  try {
    const db = await openDB();
    const settings = await getAll<{ key: string; value: unknown }>(db, "settings");
    const pendingOps = await getPendingOperations("pending");
    const lastSyncAt = settings.find((s) => s.key === "lastSyncAt")?.value as number | undefined;

    return {
      lastSyncAt: lastSyncAt ?? null,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      isSyncing: false,
      pendingCount: pendingOps.length,
      conflicts: [],
    };
  } catch {
    return {
      lastSyncAt: null,
      isOnline: true,
      isSyncing: false,
      pendingCount: 0,
      conflicts: [],
    };
  }
}

export async function queueOfflineChange<T extends Record<string, unknown>>(
  operation: "create" | "update" | "delete",
  entity: "clients" | "products" | "invoices" | "payments" | "expenses" | "settings" | "posOrders" | "posReturns",
  entityId: string,
  organizationId: string,
  payload: T,
  priority: "low" | "medium" | "high" = "medium"
): Promise<PendingOperation> {
  const recordWithMeta = {
    ...payload,
    __operation: operation,
    __entity: entity,
    __entityId: entityId,
    __organizationId: organizationId,
    __queuedAt: Date.now(),
  };

  return enqueueOperation(operation, entity, entityId, organizationId, recordWithMeta, priority);
}

export async function processSyncQueue(): Promise<DeltaSyncResult> {
  const pendingOps = await getPendingOperations("pending");
  const result: DeltaSyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: [],
    errors: [],
  };

  if (pendingOps.length === 0) return result;

  for (const op of pendingOps) {
    try {
      await updateOperationStatus(op.id, "processing");

      const response = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: op.operation,
          entity: op.entity,
          entityId: op.entityId,
          payload: op.payload,
          checksum: op.checksum,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          const conflict: ConflictRecord = {
            id: crypto.randomUUID(),
            entity: op.entity,
            entityId: op.entityId,
            organizationId: op.organizationId,
            localVersion: op.payload,
            remoteVersion: errorData.remote ?? {},
            localUpdatedAt: op.createdAt,
            remoteUpdatedAt: Date.now(),
            baseVersion: null,
            detectedAt: Date.now(),
            resolved: false,
          };
          result.conflicts.push(conflict);
          await updateOperationStatus(op.id, "failed", `Conflict: ${errorData.error ?? "Version mismatch"}`);
        } else {
          const errorMsg = errorData.error ?? `HTTP ${response.status}`;
          result.errors.push(`${op.entity}.${op.entityId}: ${errorMsg}`);
          await updateOperationStatus(op.id, "failed", errorMsg);
        }
        continue;
      }

      const responseData = await response.json().catch(() => null);
      if (responseData?.success) {
        await removeOperation(op.id);
        result.pushed++;
      } else {
        await updateOperationStatus(op.id, "failed", responseData?.error ?? "Unknown error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      result.errors.push(`${op.entity}.${op.entityId}: ${message}`);
      await updateOperationStatus(op.id, "pending", message);
    }
  }

  if (result.errors.length === 0 && result.conflicts.length === 0) {
    await pullServerChanges();
    await updateLastSyncTime();
  }

  return result;
}

export async function pullServerChanges(since?: number): Promise<number> {
  const lastSync = since ?? (await getLastSyncTime());

  try {
    const url = new URL("/api/sync/pull", window.location.origin);
    if (lastSync) {
      url.searchParams.set("since", String(lastSync));
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) return 0;

    const data = await response.json();
    if (!data.changes || !Array.isArray(data.changes)) return 0;

    const db = await openDB();
    let pulled = 0;

    for (const change of data.changes) {
      const entity = change.entity as "clients" | "products" | "invoices" | "payments" | "expenses" | "settings" | "posOrders" | "posReturns";
      if (!["clients", "products", "invoices", "payments", "expenses", "settings", "posOrders", "posReturns"].includes(entity)) {
        continue;
      }

      if (change.deleted) {
        await del(db, entity, change.id);
      } else {
        const record = { ...change };
        delete (record as { entity?: string }).entity;
        delete (record as { deleted?: boolean }).deleted;
        delete (record as { operation?: string }).operation;
        await put(db, entity, record);
      }
      pulled++;
    }

    return pulled;
  } catch {
    return 0;
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  try {
    const db = await openDB();
    const settings = await getAll<{ key: string; value: unknown }>(db, "settings");
    const entry = settings.find((s) => s.key === "lastSyncAt");
    return (entry?.value as number | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function updateLastSyncTime(): Promise<void> {
  const db = await openDB();
  await put(db, "settings", {
    key: "lastSyncAt",
    value: Date.now(),
    updatedAt: new Date().toISOString(),
  });
}

export async function registerConflictResolution(
  conflictId: string,
  action: ConflictAction
): Promise<boolean> {
  try {
    const response = await fetch("/api/sync/conflict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conflictId, action }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function performBackgroundSync(): Promise<DeltaSyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { pushed: 0, pulled: 0, conflicts: [], errors: ["Offline"] };
  }

  const pending = await getPendingOperations("pending");
  if (pending.length === 0) {
    return { pushed: 0, pulled: 0, conflicts: [], errors: [] };
  }

  return processSyncQueue();
}

export async function resolveConflict(
  conflictId: string,
  strategy: "last-write-wins" | "manual",
  override?: Record<string, unknown>
): Promise<boolean> {
  try {
    const db = await openDB();
    const conflicts = await getAll<ConflictRecord>(db, "pendingOperations");
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (!conflict) return false;

    const ctx: ConflictContext = {
      entity: conflict.entity,
      entityId: conflict.entityId,
      local: conflict.localVersion ?? {},
      remote: conflict.remoteVersion ?? {},
      base: conflict.baseVersion ?? null,
      localUpdatedAt: conflict.localUpdatedAt ?? Date.now(),
      remoteUpdatedAt: conflict.remoteUpdatedAt ?? Date.now(),
    };

    const resolution = strategy === "last-write-wins"
      ? resolveConflictStrategy(ctx, "last-write-wins")
      : override
        ? { strategy: "keep-local" as const, reason: "User selected override", localRecord: override, remoteRecord: ctx.remote }
        : resolveConflictStrategy(ctx, "manual");

    const resolvedRecord = resolution.strategy === "keep-remote"
      ? ctx.remote
      : resolution.strategy === "keep-both"
        ? { ...ctx.local, ...ctx.remote }
        : resolution.strategy === "keep-local"
          ? ctx.local
          : override ?? ctx.local;

    const entity = conflict.entity as "clients" | "products" | "invoices" | "payments" | "expenses" | "settings";
    if (["clients", "products", "invoices", "payments", "expenses", "settings"].includes(entity)) {
      await put(db, entity, resolvedRecord);
    }

    await del(db, "pendingOperations", conflict.id);

    const response = await fetch("/api/sync/conflict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conflictId, resolution }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
