"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  openDB,
  get,
  getAll,
  put,
  del,
  clear,
} from "@/lib/offline/db";
import type {
  OfflineClient,
  OfflineProduct,
  OfflineInvoice,
  OfflinePayment,
  OfflineExpense,
  OfflineSetting,
  OfflineStore,
  OfflineDB,
} from "@/lib/offline/schema";
import {
  queueOfflineChange,
  processSyncQueue,
  getSyncState,
  pullServerChanges,
  updateLastSyncTime,
  getLastSyncTime,
  performBackgroundSync,
} from "@/lib/sync/engine";
import { getPendingCount } from "@/lib/offline/queue";
import { simpleChecksum } from "@/lib/crypto";

type OfflineData = {
  clients: OfflineClient[];
  products: OfflineProduct[];
  invoices: OfflineInvoice[];
  payments: OfflinePayment[];
  expenses: OfflineExpense[];
  settings: OfflineSetting[];
};

type OfflineStatus = "online" | "offline" | "syncing" | "error";

const ENTITY_STORES: Record<keyof Omit<OfflineData, "settings">, OfflineStore> = {
  clients: "clients",
  products: "products",
  invoices: "invoices",
  payments: "payments",
  expenses: "expenses",
};

export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [data, setData] = useState<OfflineData>({
    clients: [],
    products: [],
    invoices: [],
    payments: [],
    expenses: [],
    settings: [],
  });
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<OfflineDB | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initDB = useCallback(async () => {
    if (dbRef.current) return dbRef.current;
    try {
      const db = await openDB();
      dbRef.current = db;
      return db;
    } catch {
      setError("IndexedDB is not available");
      return null;
    }
  }, []);

  const loadAllData = useCallback(async () => {
    const db = await initDB();
    if (!db) return;

    const next: Partial<OfflineData> = {};
    for (const [entity, store] of Object.entries(ENTITY_STORES)) {
      const records = await getAll(db, store as OfflineStore);
      next[entity as keyof Omit<OfflineData, "settings">] = records as any;
    }
    const settings = await getAll<OfflineSetting>(db, "settings");
    next.settings = settings;

    setData((prev) => ({ ...prev, ...next } as OfflineData));
  }, [initDB]);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const refreshLastSync = useCallback(async () => {
    const t = await getLastSyncTime();
    setLastSyncAt(t);
  }, []);

  useEffect(() => {
    initDB().then(() => {
      loadAllData();
      refreshPendingCount();
      refreshLastSync();
    });
  }, [initDB, loadAllData, refreshPendingCount, refreshLastSync]);

  useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      performBackgroundSync().then((result) => {
        if (result.errors.length > 0) {
          setStatus("error");
          setError(result.errors[0]);
        } else {
          setStatus("online");
        }
        refreshPendingCount();
        refreshLastSync();
        loadAllData();
      });
    };
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        performBackgroundSync().then(() => {
          refreshPendingCount();
          refreshLastSync();
          loadAllData();
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [loadAllData, refreshPendingCount, refreshLastSync]);

  const mutate = useCallback(
    async <T extends Record<string, unknown>>(
      entity: "clients" | "products" | "invoices" | "payments" | "expenses",
      entityId: string,
      payload: T,
      operation: "create" | "update" | "delete" = "update",
      priority: "low" | "medium" | "high" = "medium",
      optimisticUpdate?: (current: T[]) => T[]
    ) => {
      const db = await initDB();
      if (!db) {
        setError("IndexedDB unavailable");
        return { success: false as const, error: "IndexedDB unavailable" };
      }

      const store = ENTITY_STORES[entity];
      const checksum = simpleChecksum(payload);
      const existing = await get<OfflineClient | OfflineProduct | OfflineInvoice | OfflinePayment | OfflineExpense>(db, store, entityId);

      if (operation === "create" && existing) {
        return { success: false as const, error: "Duplicate ID" };
      }

      const now = new Date().toISOString();
      const record = {
        ...(existing ?? { id: entityId }),
        ...payload,
        id: entityId,
        updatedAt: now,
        createdAt: existing?.createdAt ?? now,
      } as OfflineClient | OfflineProduct | OfflineInvoice | OfflinePayment | OfflineExpense;

      await put(db, store, record);

      if (optimisticUpdate) {
        setData((prev) => {
          const current = prev[entity] as unknown as T[];
          const next = optimisticUpdate(current);
          return { ...prev, [entity]: next } as OfflineData;
        });
      } else {
        setData((prev) => ({ ...prev, [entity]: [record] } as OfflineData));
      }

      const organizationId = (record as { organizationId?: string }).organizationId ?? "";
      if (organizationId) {
        await queueOfflineChange(operation, entity, entityId, organizationId, record as unknown as Record<string, unknown>, priority);
      }

      await refreshPendingCount();

      if (navigator.onLine) {
        setStatus("syncing");
        try {
          const result = await processSyncQueue();
          if (result.errors.length > 0) {
            setStatus("error");
            setError(result.errors[0]);
          } else {
            setStatus("online");
          }
          await refreshPendingCount();
          await refreshLastSync();
          await loadAllData();
        } catch (err) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Sync failed");
        }
      } else {
        setStatus("offline");
      }

      return { success: true as const };
    },
    [initDB, refreshPendingCount, refreshLastSync, loadAllData]
  );

  const manualSync = useCallback(async () => {
    if (!navigator.onLine) {
      setError("Cannot sync while offline");
      return { pushed: 0, pulled: 0, conflicts: [], errors: ["Offline"] };
    }
    setStatus("syncing");
    setError(null);
    try {
      const result = await performBackgroundSync();
      await refreshPendingCount();
      await refreshLastSync();
      await loadAllData();
      if (result.errors.length > 0) {
        setStatus("error");
        setError(result.errors[0]);
      } else {
        setStatus("online");
      }
      return result;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sync failed");
      return { pushed: 0, pulled: 0, conflicts: [], errors: ["Sync failed"] };
    }
  }, [refreshPendingCount, refreshLastSync, loadAllData]);

  const reset = useCallback(async () => {
    const db = await initDB();
    if (!db) return;
    for (const store of Object.values(ENTITY_STORES)) {
      await clear(db, store);
    }
    await clear(db, "settings");
    await clear(db, "pendingOperations");
    setData({
      clients: [],
      products: [],
      invoices: [],
      payments: [],
      expenses: [],
      settings: [],
    });
    setPendingCount(0);
    setLastSyncAt(null);
    setStatus(navigator.onLine ? "online" : "offline");
  }, [initDB]);

  return {
    status,
    pendingCount,
    lastSyncAt,
    data,
    error,
    mutate,
    manualSync,
    reset,
    refresh: loadAllData,
  };
}
