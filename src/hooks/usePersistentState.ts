import { useEffect, useRef, useState } from "react";

/**
 * Drop-in replacement for useState that persists its value to localStorage
 * under the given key. Survives:
 *   - hard browser reload
 *   - Vite HMR
 *   - navigation away and back
 *   - SSR hydration (it stays empty on the server, hydrates on the client).
 *
 * The serializer is JSON by default.
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  options: { storage?: "local" | "session" } = {},
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `moneta_${key}`;
  const storage = options.storage ?? "local";

  const [value, setValue] = useState<T>(initial);
  const hydratedRef = useRef(false);

  // Hydrate on mount (client only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const store = storage === "session" ? window.sessionStorage : window.localStorage;
      const raw = store.getItem(storageKey);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        setValue(parsed as T);
      }
    } catch (e) {
      console.warn(`[usePersistentState] hydrate '${storageKey}' failed:`, e);
    } finally {
      hydratedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change (skip the initial sync render before hydration).
  useEffect(() => {
    if (!hydratedRef.current || typeof window === "undefined") return;
    try {
      const store = storage === "session" ? window.sessionStorage : window.localStorage;
      if (value === undefined || value === null) store.removeItem(storageKey);
      else store.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.warn(`[usePersistentState] persist '${storageKey}' failed:`, e);
    }
  }, [value, storageKey, storage]);

  return [value, setValue];
}
