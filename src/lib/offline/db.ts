import type {
  OfflineDB,
  OfflineRecord,
  OfflineSchema,
  OfflineStore,
  OfflineStoreName,
} from "./schema";

const DB_NAME = "kaziflow-offline";
const DB_VERSION = 1;

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";
}

function promisifyRequest<T>(
  request: IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openDB(): Promise<OfflineDB> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result as unknown as OfflineDB;

      const stores: { name: OfflineStoreName; keyPath: string; indexes: { name: string; keyPath: string | string[] }[] }[] = [
        {
          name: "clients",
          keyPath: "id",
          indexes: [
            { name: "byId", keyPath: "id" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byUpdatedAt", keyPath: "updatedAt" },
          ],
        },
        {
          name: "products",
          keyPath: "id",
          indexes: [
            { name: "byId", keyPath: "id" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byUpdatedAt", keyPath: "updatedAt" },
          ],
        },
        {
          name: "invoices",
          keyPath: "id",
          indexes: [
            { name: "byId", keyPath: "id" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byUpdatedAt", keyPath: "updatedAt" },
          ],
        },
        {
          name: "payments",
          keyPath: "id",
          indexes: [
            { name: "byId", keyPath: "id" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byUpdatedAt", keyPath: "updatedAt" },
          ],
        },
        {
          name: "expenses",
          keyPath: "id",
          indexes: [
            { name: "byId", keyPath: "id" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byUpdatedAt", keyPath: "updatedAt" },
          ],
        },
        {
          name: "settings",
          keyPath: "key",
          indexes: [
            { name: "byId", keyPath: "key" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byUpdatedAt", keyPath: "updatedAt" },
          ],
        },
        {
          name: "pendingOperations",
          keyPath: "id",
          indexes: [
            { name: "byId", keyPath: "id" },
            { name: "byOrganization", keyPath: "organizationId" },
            { name: "byStatus", keyPath: "status" },
            { name: "byPriority", keyPath: "priority" },
            { name: "byCreatedAt", keyPath: "createdAt" },
          ],
        },
      ];

      for (const storeDef of stores) {
        if (!db.objectStoreNames.contains(storeDef.name)) {
          const store = db.createObjectStore(storeDef.name, { keyPath: storeDef.keyPath });
          for (const idx of storeDef.indexes) {
            store.createIndex(idx.name, idx.keyPath as string | string[]);
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result as OfflineDB);
  });
}

export function getStore<T = OfflineRecord>(
  db: OfflineDB,
  storeName: OfflineStore
): IDBObjectStore {
  const tx = db.transaction(storeName, "readwrite");
  return tx.objectStore(storeName) as IDBObjectStore;
}

export async function put<T = OfflineRecord>(
  db: OfflineDB,
  storeName: OfflineStore,
  value: T
): Promise<void> {
  const store = getStore(db, storeName);
  const request = store.put(value);
  await promisifyRequest(request);
}

export async function get<T = OfflineRecord>(
  db: OfflineDB,
  storeName: OfflineStore,
  key: string
): Promise<T | undefined> {
  const store = getStore(db, storeName);
  const request = store.get(key);
  return promisifyRequest<T | undefined>(request);
}

export async function getAll<T = OfflineRecord>(
  db: OfflineDB,
  storeName: OfflineStore,
  indexName?: string,
  query?: IDBKeyRange
): Promise<T[]> {
  const source = indexName
    ? getStore(db, storeName).index(indexName)
    : getStore(db, storeName);
  const request = query ? source.getAll(query) : source.getAll();
  return promisifyRequest<T[]>(request);
}

export async function del(
  db: OfflineDB,
  storeName: OfflineStore,
  key: string
): Promise<void> {
  const store = getStore(db, storeName);
  const request = store.delete(key);
  await promisifyRequest(request);
}

export async function clear(db: OfflineDB, storeName: OfflineStore): Promise<void> {
  const store = getStore(db, storeName);
  const request = store.clear();
  await promisifyRequest(request);
}
