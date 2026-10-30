"use client";
import { STATUS_COLORS } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { avgPct, cn, countBy } from "@/lib/utils";
import { clickableCard } from "./ui";

interface Props {
  projects: Project[];
  pinnedCount: number;
  active: string | null;
  onToggle: (k: string | null) => void;
  onOpenPins: () => void;
}

export default function KpiStrip({ projects, pinnedCount, active, onToggle, onOpenPins }: Props) {
  const n = projects.length;
  const wip = countBy(projects, "WIP");
  const cards: { key: string | null; lbl: string; val: string | number; sub: string; stripe: string; action?: () => void }[] = [
    { key: null, lbl: "Total Projects", val: n, sub: `${avgPct(projects)}% avg progress`, stripe: "#7F77DD" },
    { key: "WIP", lbl: "In Progress", val: wip, sub: `${n ? Math.round((wip / n) * 100) : 0}% of projects`, stripe: STATUS_COLORS.WIP },
    { key: "Done", lbl: "Completed", val: countBy(projects, "Done"), sub: "PRD-Live / Done", stripe: STATUS_COLORS.Done },
    { key: "Parked", lbl: "Parked", val: countBy(projects, "Parked"), sub: "needs unblocking", stripe: STATUS_COLORS.Parked },
    { key: null, lbl: "🔨 Pinned", val: pinnedCount, sub: "open Pin Board →", stripe: "#EF9F27", action: onOpenPins },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 px-6 py-4 border-b bg-background max-[900px]:grid-cols-2">
      {cards.map((c, i) => {
        const isActive = !!c.key && active === c.key;
        const click = c.action ?? (() => onToggle(!c.key || active === c.key ? null : c.key));
        return (
          <div
            key={c.lbl}
            className={cn(
              "relative overflow-hidden rounded-lg border bg-bg2 px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300", clickableCard,
              isActive && "border-primary bg-accent ring-2 ring-primary/20"
            )}
            onClick={click}
            style={{ animationDelay: `${i * 50}ms` }}
            role="button"
            aria-pressed={c.key ? isActive : undefined}
            tabIndex={0}
            title={c.action ? undefined : c.key ? (isActive ? "Click to clear filter" : `Click to show only ${c.key}`) : "Click to clear status filter"}
            onKeyDown={(e) => e.key === "Enter" && click()}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: c.stripe }} />
            <div className="text-[10px] uppercase tracking-[.07em] text-fg3 mb-1.5 mt-0.5">{c.lbl}</div>
            <div className="text-[26px] font-semibold leading-none text-foreground tabular-nums">{c.val}</div>
            <div className="text-[10px] text-fg3 mt-1">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
