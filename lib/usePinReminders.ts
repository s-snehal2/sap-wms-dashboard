"use client";
import { useEffect, useRef } from "react";
import { LS_REMINDED, PIN_EMOJI, PRIORITY_ORDER, REMIND_MS } from "./constants";
import type { Pin, Project } from "./types";

/**
 * Sends desktop notifications for pinned projects on each pin's remind interval (daily / weekly).
 * Runs while the dashboard is open in a tab or installed-app window; checks once a minute.
 */
export function usePinReminders(pins: Pin[], projects: Project[], enabled: boolean, onClick: (pid: string) => void) {
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const check = () => {
      let last: Record<string, number> = {};
      try {
        last = JSON.parse(localStorage.getItem(LS_REMINDED) || "{}");
      } catch {
        /* corrupt → start fresh */
      }
      const now = Date.now();
      const byPid = new Map(projects.map((p) => [p.pid, p]));
      let sent = 0;
      for (const pin of [...pins].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])) {
        const every = REMIND_MS[pin.remind];
        const proj = byPid.get(pin.pid);
        if (!every || !proj || sent >= 3) continue; // at most 3 popups at once
        const added = Date.parse(pin.addedAt);
        const prev = last[pin.pid] ?? (isNaN(added) ? now : added);
        if (now - prev < every) continue;
        const n = new Notification(`${PIN_EMOJI} ${proj.pid} · ${pin.priority.toUpperCase()}`, {
          body: `${proj.name}\n${proj.status} · ${proj.pct}%${pin.note ? `\n${pin.note}` : ""}`,
          tag: `sap-wms-${pin.pid}`,
        });
        n.onclick = () => {
          window.focus();
          clickRef.current(pin.pid);
          n.close();
        };
        last[pin.pid] = now;
        sent++;
      }
      try {
        localStorage.setItem(LS_REMINDED, JSON.stringify(last));
      } catch {
        /* ignore */
      }
    };

    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [enabled, pins, projects]);
}
