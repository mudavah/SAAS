"use client";

import * as React from "react";

/**
 * Registers the KaziFlow service worker. Skipped in development to avoid
 * interfering with Next.js hot-reload / webpack asset caching.
 */
export function RegisterSW() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    if (process.env.NODE_ENV === "development") return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
