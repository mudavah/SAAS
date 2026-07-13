const VERSION = "v1";
const STATIC_CACHE = `kaziflow-static-${VERSION}`;
const RUNTIME_CACHE = `kaziflow-runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/offline.html", "/dashboard", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.includes(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|ico|gif|webp|json)$/.test(
      url.pathname
    )
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls (so data is always fresh when online, with
  // an offline fallback).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Cache-first for static assets (app shell, JS, CSS, images, fonts).
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Stale-while-revalidate for everything else (HTML navigations etc.).
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.status === 200 && res.type === "basic") {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    if (request.mode === "navigate") return caches.match(OFFLINE_URL);
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match(OFFLINE_URL);
    return new Response(
      JSON.stringify({ error: "You are offline.", offline: true }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        caches.open(cacheName).then((cache) => cache.put(request, res.clone()));
      }
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("push", (event) => {
  let data = { title: "KaziFlow", body: "You have a new update." };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      return existing ? existing.focus() : self.clients.openWindow("/dashboard");
    })
  );
});

// Background sync: replay queued mutations stored under a "__sync__" marker.
self.addEventListener("sync", (event) => {
  if (event.tag === "kaziflow-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    for (const req of requests) {
      if (req.url.includes("__sync__")) {
        try {
          const res = await fetch(req);
          if (res && res.ok) await cache.delete(req);
        } catch (e) {}
      }
    }
  } catch (e) {}
}

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
