import { logger } from "@/lib/logger";

type SyncOperation = {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  organizationId?: string;
};

const SYNC_TAG = "kaziflow-sync";

function isSyncableRequest(req: Request): boolean {
  const url = new URL(req.url);
  return (
    req.method === "POST" ||
    req.method === "PATCH" ||
    req.method === "DELETE"
  ) && url.pathname.startsWith("/api/");
}

async function hashBody(body: unknown): Promise<string> {
  const str = JSON.stringify(body);
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function queueForBackgroundSync(request: Request): Promise<void> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
    console.warn("[sw] Background Sync not supported");
    return;
  }

  if (!isSyncableRequest(request)) {
    return;
  }

  try {
    const url = new URL(request.url);
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json().catch(() => undefined)
      : undefined;

    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      method: request.method as SyncOperation["method"],
      url: `${url.pathname}${url.search}`,
      body,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
    };

    const cache = await caches.open(SYNC_TAG);
    const serialized = JSON.stringify(operation);
    const response = new Response(serialized, {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(`/sync-queue/${operation.id}`, response);

    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(`sync-${operation.id}`);
  } catch (error) {
    logger.error("[sw] Failed to queue for background sync:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
  }
}

export async function processQueuedSync(): Promise<{
  processed: number;
  failed: number;
}> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
    return { processed: 0, failed: 0 };
  }

  try {
    const cache = await caches.open(SYNC_TAG);
    const keys = await cache.keys();
    let processed = 0;
    let failed = 0;

    for (const key of keys) {
      if (!key.url.includes("/sync-queue/")) continue;

      try {
        const response = await cache.match(key);
        if (!response) continue;

        const operation: SyncOperation = await response.json();

        const syncResponse = await fetch(operation.url, {
          method: operation.method,
          headers: {
            "Content-Type": "application/json",
            ...operation.headers,
          },
          body: operation.body ? JSON.stringify(operation.body) : undefined,
        });

        if (syncResponse.ok) {
          await cache.delete(key);
          processed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  } catch {
    return { processed: 0, failed: 0 };
  }
}

export function setupServiceWorkerIntegration(): void {
  if (!("serviceWorker" in navigator)) {
    console.warn("[sw] Service Worker not supported");
    return;
  }

  window.addEventListener("online", async () => {
    console.log("[sw] Back online, processing queued sync...");
    await processQueuedSync();
  });

  navigator.serviceWorker.addEventListener("message", async (event: MessageEvent) => {
    if (event.data?.type === "SYNC_COMPLETE") {
      console.log("[sw] Background sync completed:", event.data);
      window.dispatchEvent(
        new CustomEvent("kf-sync-complete", { detail: event.data })
      );
    }
  });
}
