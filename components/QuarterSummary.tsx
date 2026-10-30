"use client";
import { QUARTERS, QUARTER_COLORS, QUARTER_LABELS, STATUS_KEYS, statusColor } from "@/lib/constants";
import type { Project, Quarter } from "@/lib/types";
import { avgPct, cn, countBy, qOf } from "@/lib/utils";
import { Bar, clickableCard } from "./ui";

interface Props {
  projects: Project[];
  /** Omit active/onToggle for a read-only summary (used on the Pin Board). */
  active?: Quarter | null;
  onToggle?: (q: Quarter | null) => void;
  /** Compact cards show count + average only. */
  compact?: boolean;
  unit?: string;
}

export default function QuarterSummary({ projects, active = null, onToggle, compact, unit = "projects" }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2.5 mb-3 max-[900px]:grid-cols-2">
      {QUARTERS.map((q) => {
        const ps = projects.filter((p) => qOf(p) === q);
        const avg = avgPct(ps);
        const c = QUARTER_COLORS[q];
        const isActive = active === q;
        const toggle = onToggle ? () => onToggle(isActive ? null : q) : undefined;
        return (
          <div
            key={q}
            className={cn(
              "relative overflow-hidden rounded-lg border bg-card p-3.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              toggle && clickableCard,
              isActive && "border-primary bg-accent ring-2 ring-primary/20"
            )}
            onClick={toggle}
            title={toggle ? (isActive ? "Click to clear quarter filter" : `Click to filter by ${q}`) : undefined}
            role={toggle ? "button" : undefined}
            aria-pressed={toggle ? isActive : undefined}
            tabIndex={toggle ? 0 : undefined}
            onKeyDown={toggle ? (e) => e.key === "Enter" && toggle() : undefined}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: c }} />
            <div className="text-[10px] font-semibold uppercase tracking-[.08em] text-fg3 mb-2">{QUARTER_LABELS[q]}</div>
            <div className="text-[22px] font-semibold leading-none" style={{ color: c }}>
              {ps.length}
            </div>
            <div className="text-[10px] text-fg3 mt-1">
              {unit}
              {compact && ` · ${avg}% avg`}
              {isActive && " · filtered"}
            </div>
            {!compact && ps.length > 0 && (
              <div className="mt-2">
                {STATUS_KEYS.map((s) => (
                  <div key={s} className="flex items-center justify-between py-[3px] text-[11px] text-fg2">
                    <span>{s}</span>
                    <span className="font-semibold" style={{ color: statusColor(s) }}>
                      {countBy(ps, s)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {ps.length > 0 ? (
              <>
                <Bar pct={avg} color={c} className="h-1 mt-2 flex-none" />
                {!compact && <div className="text-[10px] text-fg3 mt-1">{avg}% avg progress</div>}
              </>
            ) : (
              !compact && <div className="text-center py-3 text-[11px] text-fg3">No projects</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
