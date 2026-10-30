"use client";
import { useEffect, useState } from "react";

/**
 * useState backed by localStorage. Reads after mount (so server and client
 * render the same seed first), and only writes once the stored value is loaded.
 */
export function usePersistentState<T>(key: string, initial: T, isValid: (v: unknown) => boolean = () => true) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValid(parsed)) setValue(parsed as T);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable */
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
