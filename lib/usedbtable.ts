"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { applyChanges, loadAll } from "@/app/actions/data";
import type { AllData } from "@/lib/server/load";
import type { TableSpec } from "./tables";

type Updater<T> = T[] | ((prev: T[]) => T[]);

/** How often to pick up colleagues' changes while the tab is open. */
const REFRESH_MS = 20_000;

/* One shared "can't reach the server" notice (e.g. while `pnpm dev` restarts). */
const OFFLINE_TOAST = "server-offline";
let offline = false;
const markOffline = () => {
  if (!offline) toast.loading("Can't reach the server — retrying…", { id: OFFLINE_TOAST });
  offline = true;
};
const markOnline = () => {
  if (offline) toast.success("Reconnected", { id: OFFLINE_TOAST, duration: 2000 });
  offline = false;
};

/** What the shared refresher needs from each list. */
export interface TableControl<T> {
  replace: (rows: T[]) => void;
  busy: () => boolean;
}

/**
 * One list stored in the database. Works like useState: `setRows(next)` updates the screen
 * immediately, then saves only what changed. Starts with the rows that came with the page.
 * Loading/refreshing is shared by all lists — see useDbSync below.
 */
export function useDbTable<T>(spec: TableSpec<T>, initial: T[], requestReload: () => void) {
  const [rows, setRowsState] = useState<T[]>(initial);
  const rowsRef = useRef<T[]>(initial);
  const pending = useRef(0);
  const dirty = useRef(false);

  const apply = useCallback((next: T[]) => {
    rowsRef.current = next;
    setRowsState(next);
  }, []);

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
        markOffline();
        toast.error("Couldn't reach the server — your last change was not saved. It will reload when the connection is back.");
        dirty.current = true;
      } finally {
        pending.current--;
        if (pending.current === 0 && dirty.current) {
          dirty.current = false;
          requestReload();
        }
      }
    },
    [spec, requestReload]
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
      const blocked =
        spec.editable &&
        [...removed.map((k) => prevMap.get(k)!), ...upserts.filter((r) => prevMap.has(spec.key(r)))].some((r) => r && !spec.editable!(r));
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

  const control: TableControl<T> = {
    replace: (fresh) => {
      if (pending.current === 0) apply(fresh);
      else dirty.current = true; // a save is in flight — reload again once it finishes
    },
    busy: () => pending.current > 0,
  };
  const controlRef = useRef(control);
  controlRef.current = control;

  return [rows, setRows, controlRef] as const;
}

type Controls = { [K in keyof AllData]: React.RefObject<TableControl<AllData[K][number]>> };

/**
 * Refreshes ALL lists with ONE request: every 20 s while the tab is visible, when you come back
 * to the tab, and after a save that needs it. Returns the reload function.
 */
export function useDbSync(controls: Controls) {
  const ctlRef = useRef(controls);
  ctlRef.current = controls;
  const running = useRef(false);

  const reload = useCallback(async () => {
    const ctl = ctlRef.current;
    if (running.current) return;
    if (Object.values(ctl).some((c) => c.current?.busy())) return; // a save will trigger the reload
    running.current = true;
    try {
      const res = await loadAll();
      markOnline();
      if (!res.ok) return void toast.error(res.error);
      ctl.projects.current?.replace(res.data.projects);
      ctl.notes.current?.replace(res.data.notes);
      ctl.pins.current?.replace(res.data.pins);
      ctl.remarks.current?.replace(res.data.remarks);
    } catch {
      markOffline();
      setTimeout(() => document.visibilityState === "visible" && reload(), 5000);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && reload();
    const t = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);

  return reload;
}
