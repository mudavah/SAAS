"use client";

import { useCallback, useRef, useState } from "react";
import type {
  OfflineClient,
  OfflineProduct,
  OfflineInvoice,
  OfflinePayment,
  OfflineExpense,
  OfflineSetting,
} from "@/lib/offline/schema";
import { openDB, get, put, del } from "@/lib/offline/db";
import { queueOfflineChange, processSyncQueue } from "@/lib/sync/engine";
import type { PendingOperation } from "@/lib/offline/schema";

type EntityType = "clients" | "products" | "invoices" | "payments" | "expenses" | "settings";

type OptimisticRecord<T> = T & { __optimistic?: boolean; __original?: T };

type RollbackState<T> = {
  original: T;
  timestamp: number;
};

type PendingOptimistic<T> = {
  operation: "create" | "update" | "delete";
  entity: EntityType;
  entityId: string;
  rollback: RollbackState<T> | null;
  promise: Promise<{ success: boolean; error?: string }>;
};

export interface OptimisticMutationOptions<T> {
  entity: EntityType;
  entityId: string;
  payload: Partial<T>;
  operation?: "create" | "update" | "delete";
  priority?: "low" | "medium" | "high";
  onOptimistic?: (current: T[] | null) => T[] | null;
  onRollback?: (original: T | null) => void;
  onSuccess?: (result: T) => void;
  onError?: (error: string) => void;
}

export interface UseOptimisticMutationReturn<T> {
  mutate: (options: OptimisticMutationOptions<T>) => Promise<{ success: boolean; error?: string }>;
  isPending: boolean;
  pendingCount: number;
  rollback: (entityId: string) => void;
  rollbackAll: () => void;
}

export function useOptimisticMutation<T extends Record<string, unknown>>(): UseOptimisticMutationReturn<T> {
  const [isPending, setIsPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pendingRef = useRef<Map<string, PendingOptimistic<T>>>(new Map());
  const dbRef = useRef<ReturnType<typeof openDB> | null>(null);

  const getDB = useCallback(async () => {
    if (!dbRef.current) {
      dbRef.current = await openDB();
    }
    return dbRef.current;
  }, []);

  const mutate = useCallback(
    async (options: OptimisticMutationOptions<T>): Promise<{ success: boolean; error?: string }> => {
      const {
        entity,
        entityId,
        payload,
        operation = "update",
        priority = "medium",
        onOptimistic,
        onRollback,
        onSuccess,
        onError,
      } = options;

      setIsPending(true);
      setPendingCount((prev) => prev + 1);

      const db = await getDB();
      if (!db) {
        const error = "IndexedDB unavailable";
        setIsPending(false);
        setPendingCount((prev) => prev - 1);
        onError?.(error);
        return { success: false, error };
      }

      let original: T | null = null;
      let rollbackState: RollbackState<T> | null = null;

      try {
        if (operation !== "create") {
          const existing = await get<T>(db, entity, entityId);
          if (existing) {
            original = existing;
            rollbackState = { original: existing, timestamp: Date.now() };
          }
        }

        const now = new Date().toISOString();
        const optimisticRecord = {
          ...(original ?? { id: entityId }),
          ...payload,
          id: entityId,
          updatedAt: now,
          createdAt: original?.createdAt ?? now,
          __optimistic: true,
        } as OptimisticRecord<T>;

        await put(db, entity, optimisticRecord);

        onOptimistic?.([optimisticRecord] as unknown as T[]);

        const organizationId = (optimisticRecord as { organizationId?: string }).organizationId ?? "";
        const opPromise = organizationId
          ? queueOfflineChange(operation, entity, entityId, organizationId, optimisticRecord as unknown as Record<string, unknown>, priority)
          : Promise.resolve({ id: entityId } as PendingOperation);

        const pendingKey = `${entity}:${entityId}`;
        pendingRef.current.set(pendingKey, {
          operation,
          entity,
          entityId,
          rollback: rollbackState,
          promise: opPromise,
        });

        await opPromise;

        const cleanRecord = { ...optimisticRecord };
        delete (cleanRecord as { __optimistic?: boolean }).__optimistic;

        await put(db, entity, cleanRecord);

        pendingRef.current.delete(pendingKey);
        setPendingCount((prev) => Math.max(0, prev - 1));
        setIsPending(false);

        onSuccess?.(cleanRecord as T);

        if (navigator.onLine) {
          processSyncQueue().then(() => {
            setPendingCount((prev) => Math.max(0, prev - 1));
          }).catch(() => {
            setPendingCount((prev) => Math.max(0, prev - 1));
          });
        }

        return { success: true };
      } catch (error) {
        if (rollbackState && original) {
          try {
            await put(db, entity, original);
            pendingRef.current.delete(`${entity}:${entityId}`);
            onRollback?.(original);
          } catch {
            onError?.(error instanceof Error ? error.message : "Rollback failed");
          }
        }

        const message = error instanceof Error ? error.message : "Operation failed";
        setPendingCount((prev) => Math.max(0, prev - 1));
        setIsPending(false);
        onError?.(message);
        return { success: false, error: message };
      }
    },
    [getDB]
  );

  const rollback = useCallback(
    async (entityId: string) => {
      const keys = Array.from(pendingRef.current.keys()).filter((key) => key.endsWith(`:${entityId}`));

      for (const key of keys) {
        const pending = pendingRef.current.get(key);
        if (!pending) continue;

        if (pending.rollback?.original) {
          try {
            const db = await getDB();
            if (db) {
              await put(db, pending.entity, pending.rollback.original);
              pending.rollback.onRollback?.(pending.rollback.original);
            }
          } catch {
            console.error(`Failed to rollback ${key}`);
          }
        }

        pendingRef.current.delete(key);
        setPendingCount((prev) => Math.max(0, prev - 1));
      }
    },
    [getDB]
  );

  const rollbackAll = useCallback(async () => {
    const db = await getDB();
    if (!db) return;

    const keys = Array.from(pendingRef.current.keys());
    for (const key of keys) {
      const pending = pendingRef.current.get(key);
      if (!pending || !pending.rollback?.original) continue;

      try {
        await put(db, pending.entity, pending.rollback.original);
        pending.rollback.onRollback?.(pending.rollback.original);
      } catch {
        console.error(`Failed to rollback ${key}`);
      }
    }

    pendingRef.current.clear();
    setPendingCount(0);
    setIsPending(false);
  }, [getDB]);

  return {
    mutate,
    isPending,
    pendingCount,
    rollback,
    rollbackAll,
  };
}
