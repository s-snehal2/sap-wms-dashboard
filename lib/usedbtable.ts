"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { applyChanges, loadRows } from "@/app/actions/data";
import type { TableSpec } from "./tables";

type Updater<T> = T[] | ((prev: T[]) => T[]);

/** How often to pick up colleagues' changes while the tab is open. */
const REFRESH_MS = 20_000;

/**
 * A list stored in the database (through the server actions) that works like useState:
 * `setRows(next)` updates the screen immediately, then saves only what changed.
 */
export function useDbTable<T>(spec: TableSpec<T>) {
  const [rows, setRowsState] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const rowsRef = useRef<T[]>([]);
  const pending = useRef(0);
  const dirty = useRef(false); // reload once current saves finish

  const apply = useCallback((next: T[]) => {
    rowsRef.current = next;
    setRowsState(next);
  }, []);

  const load = useCallback(async () => {
    if (pending.current > 0) {
      dirty.current = true; // don't overwrite changes that are still being saved
      return;
    }
    const res = await loadRows(spec.table);
    if (pending.current > 0) return; // a save started meanwhile — it will reload when done
    if (res.ok) apply(res.data as T[]);
    else toast.error(`Couldn't load ${spec.table}: ${res.error}`);
    setLoading(false);
  }, [spec, apply]);

  useEffect(() => {
    load();
    const refresh = () => document.visibilityState === "visible" && load();
    const t = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const save = useCallback(
    async (removed: string[], upserts: T[]) => {
      pending.current++;
      try {
        const res = await applyChanges(spec.table, removed, upserts as never[]);
        if (!res.ok) {
          toast.error(res.error);
          dirty.current = true; // put the screen back in line with the database
        } else if (res.data.reload) dirty.current = true;
      } catch {
        toast.error("Couldn't reach the server — your last change may not be saved");
        dirty.current = true;
      } finally {
        pending.current--;
        if (pending.current === 0 && dirty.current) {
          dirty.current = false;
          load();
        }
      }
    },
    [spec, load]
  );

  const setRows = useCallback(
    (update: Updater<T>) => {
      const prev = rowsRef.current;
      const next = typeof update === "function" ? (update as (p: T[]) => T[])(prev) : update;
      if (next === prev) return;

      const prevMap = new Map(prev.map((r) => [spec.key(r), r]));
      const nextKeys = new Set(next.map(spec.key));
      const removed = [...prevMap.keys()].filter((k) => !nextKeys.has(k));
      const upserts = next.filter((r) => {
        const old = prevMap.get(spec.key(r));
        return !old || JSON.stringify(old) !== JSON.stringify(r);
      });

      // View-only rows (a HOD looking at a team member's work) can't be changed or deleted.
      const blocked = spec.editable && [...removed.map((k) => prevMap.get(k)!), ...upserts.filter((r) => prevMap.has(spec.key(r)))].some((r) => r && !spec.editable!(r));
      if (blocked) {
        toast.error("View only — you can't change a team member's items");
        return;
      }
      if (!removed.length && !upserts.length) return;
      apply(next);
      void save(removed, upserts);
    },
    [spec, save, apply]
  );

  return [rows, setRows, { loading, reload: load }] as const;
}
