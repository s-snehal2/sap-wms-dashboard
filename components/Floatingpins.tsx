"use client";
import { createPortal } from "react-dom";
import { ExternalLink, PinOff } from "lucide-react";
import { PRIORITY_BADGE_CLASS, PRIORITY_ORDER, statusColor } from "@/lib/constants";
import type { Pin, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bar, Hammer, PidBadge, StatusBadge } from "./ui";


interface Props {
  win: Window;
  pins: Pin[];
  projects: Project[];
  onOpen: (pid: string) => void;
  onUnpin: (pid: string) => void;
}

/** Live list of pinned projects rendered into the floating desktop window. */
export default function FloatingPins({ win, pins, projects, onOpen, onUnpin }: Props) {
  const byPid = new Map(projects.map((p) => [p.pid, p]));
  const list = pins
    .map((pin) => ({ pin, proj: byPid.get(pin.pid) }))
    .filter((x): x is { pin: Pin; proj: Project } => !!x.proj)
    .sort((a, b) => PRIORITY_ORDER[a.pin.priority] - PRIORITY_ORDER[b.pin.priority] || b.proj.pct - a.proj.pct);

  const focusDashboard = (pid?: string) => {
    window.focus();
    if (pid) onOpen(pid);
  };

  return createPortal(
    <div className="min-h-screen bg-background text-foreground text-xs">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2.5 border-b bg-background/95 backdrop-blur">
        <div className="font-semibold text-[13px]">
          <Hammer /> Pinned <span className="text-fg3 font-normal">({list.length})</span>
        </div>
        <button className="inline-flex items-center gap-1 text-[11px] text-fg2 hover:text-accent-foreground" onClick={() => focusDashboard()} title="Bring the dashboard to the front">
          Dashboard <ExternalLink className="size-3" />
        </button>
      </div>
      {list.length === 0 ? (
        <div className="text-center text-fg3 px-6 py-12 leading-relaxed">
          <div className="text-3xl mb-2 opacity-50">
            <Hammer />
          </div>
          Nothing pinned yet.
          <br />
          Pin a project in the dashboard and it appears here instantly.
        </div>
      ) : (
        <ul className="p-2 flex flex-col gap-1.5">
          {list.map(({ pin, proj }, i) => (
            <li
              key={pin.pid}
              className="group rounded-md border bg-card px-2.5 py-2 cursor-pointer hover:border-primary transition-colors"
              style={{ borderLeft: `3px solid ${statusColor(proj.status)}` }}
              onClick={() => focusDashboard(proj.pid)}
              title="Open in dashboard"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Hammer delay={i * 150} />
                <PidBadge pid={proj.pid} />
                <span className={cn("text-[9px] font-bold uppercase tracking-[.07em] px-1.5 py-px rounded-full", PRIORITY_BADGE_CLASS[pin.priority])}>{pin.priority}</span>
                <span className="ml-auto">
                  <StatusBadge status={proj.status} />
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-fg3 hover:text-status-danger-txt transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(proj.pid);
                  }}
                  title="Unpin"
                  aria-label={`Unpin ${proj.pid}`}
                >
                  <PinOff className="size-3" />
                </button>
              </div>
              <div className="font-medium leading-snug line-clamp-2">{proj.name}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Bar pct={proj.pct} color={statusColor(proj.status)} />
                <span className="text-[10px] tabular-nums text-fg2">{proj.pct}%</span>
              </div>
              {pin.note && <div className="mt-1.5 text-[10.5px] text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-500/15 rounded px-2 py-1 line-clamp-2">{pin.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>,
    win.document.body
  );
}
