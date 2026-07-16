"use client";

import { useCallback, useState } from "react";

/**
 * SSR-safe localStorage state hook. Reads lazily after mount so server and
 * client render identically (avoids hydration mismatch). Falls back to the
 * provided initial value when storage is unavailable (private mode, SSR).
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);

  // Hydrate from storage on the client only.
  const [hydrated, setHydrated] = useState(false);
  if (typeof window !== "undefined" && !hydrated) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        // Defer setState to avoid setting during render.
        queueMicrotask(() => setState(JSON.parse(raw) as T));
      }
    } catch {
      /* ignore corrupt/blocked storage */
    }
    queueMicrotask(() => setHydrated(true));
  }

  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const nextValue =
          typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          /* storage may be full or blocked */
        }
        return nextValue;
      });
    },
    [key]
  );

  return [state, set] as const;
}
