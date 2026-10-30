"use client";
import { Pencil, Pin, Trash2 } from "lucide-react";
import { PIN_EMOJI, STATUS_KEYS, statusColor } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { cn, quarterClass, statusClass, statusCounts } from "@/lib/utils";
import { Badge as ShadBadge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

/* ── shared class strings (were copy-pasted into every view) ── */
export const cardHd = "text-[10px] font-semibold uppercase tracking-[.07em] text-fg3 mb-3.5 flex items-center justify-between gap-2";
export const tag = "text-[10px] font-normal normal-case tracking-normal px-2 py-0.5 rounded-full bg-bg2 text-fg3";
/** Amber tint + left stripe applied to any pinned row or card. */
export const pinnedHighlight = "bg-amber-50/80 dark:bg-amber-500/10 shadow-[inset_3px_0_0_#EF9F27]";

/** Same hover-lift feel as the Pin Board cards, for every clickable card. */
export const clickableCard =
  "cursor-pointer transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,.10)] hover:border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

/** Makes any element act like a button: click, Enter/Space, focusable. Inner buttons should stopPropagation. */
export const clickProps = (fn: () => void, label?: string) => ({
  onClick: fn,
  role: "button" as const,
  tabIndex: 0,
  "aria-label": label,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  },
});

/** Stop a click inside a clickable card from also triggering the card. */
export const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export const Section = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("bg-card border rounded-lg px-[18px] py-4", className)}>{children}</div>
);

export const Empty = ({ children }: { children: React.ReactNode }) => <div className="text-center py-8 text-fg3 text-[13px]">{children}</div>;

export const Badge = ({ cls, children }: { cls: string; children: React.ReactNode }) => (
  <ShadBadge variant="secondary" className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cls)}>
    {children}
  </ShadBadge>
);

export const StatusBadge = ({ status }: { status: string }) => <Badge cls={statusClass(status)}>{status}</Badge>;

export const QBadge = ({ q }: { q?: string }) => (
  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold inline-block tracking-wide", quarterClass(q || "—"))}>{q || "—"}</span>
);

export const PidBadge = ({ pid, className }: { pid: string; className?: string }) => (
  <span className={cn("text-[10px] font-semibold px-[7px] py-0.5 rounded bg-status-wip-bg text-status-wip-txt whitespace-nowrap shrink-0 tabular-nums", className)}>
    {pid}
  </span>
);

/** The 🔨 that keeps hammering. `delay` staggers rows so they don't all strike in sync. */
export const Hammer = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <span className={cn("animate-hammer leading-none", className)} style={{ animationDelay: `${delay}ms` }} aria-hidden>
    {PIN_EMOJI}
  </span>
);

/** The 🔨 marker shown next to anything pinned. */
export const PinMark = ({ compact }: { compact?: boolean }) => (
  <span
    className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-px rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 shrink-0 animate-in zoom-in-50 duration-200"
    title="Pinned to board"
    aria-label="Pinned"
  >
    <Hammer />
    {!compact && "Pinned"}
  </span>
);

/** One progress bar for the whole app (was re-implemented in six places). */
export const Bar = ({ pct, color, className }: { pct: number; color: string; className?: string }) => (
  <div className={cn("flex-1 h-[5px] bg-bg3 rounded-full overflow-hidden", className)}>
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
  </div>
);

export const ProgressBar = ({ pct, status, className }: { pct: number; status: string; className?: string }) => (
  <div className={cn("flex items-center gap-1.5 w-[90px] shrink-0", className)}>
    <Bar pct={pct} color={statusColor(status)} />
    <span className="text-[10px] text-fg2 min-w-[26px] text-right tabular-nums">{pct}%</span>
  </div>
);

/** SVG donut of project status counts (shared by Overview and Analytics). */
export function StatusRing({ projects, size = 80 }: { projects: Project[]; size?: number }) {
  const counts = statusCounts(projects);
  const tot = projects.length || 1;
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={STATUS_KEYS.map((k) => `${k} ${counts[k]}`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(128,128,128,.12)" strokeWidth={size * 0.09} />
        {STATUS_KEYS.map((k) => {
          const dash = (circ * counts[k]) / tot;
          const el = (
            <circle
              key={k}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={statusColor(k)}
              strokeWidth={size * 0.09}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            >
              <title>{`${k}: ${counts[k]}`}</title>
            </circle>
          );
          off += dash;
          return el;
        })}
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-semibold text-foreground">{projects.length}</div>
        <div className="text-[10px] text-fg3">total</div>
      </div>
    </div>
  );
}

export interface RowActionHandlers {
  onEdit: (pid: string) => void;
  onTogglePin?: (pid: string) => void;
  onDelete?: (pid: string) => void;
  isPinned?: (pid: string) => boolean;
}

export function RowActions({ pid, onEdit, onTogglePin, onDelete, isPinned }: RowActionHandlers & { pid: string }) {
  const pinned = isPinned?.(pid) ?? false;
  return (
    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="icon"
        className="size-7 hover:bg-accent hover:border-primary hover:text-accent-foreground"
        onClick={() => onEdit(pid)}
        title="Edit"
        aria-label={`Edit ${pid}`}
      >
        <Pencil className="size-3.5" />
      </Button>
      {onTogglePin && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "size-7 transition-transform active:scale-90",
            pinned && "bg-amber-100 border-amber-400 hover:bg-amber-200 dark:bg-amber-500/20 dark:border-amber-500/60"
          )}
          onClick={() => onTogglePin(pid)}
          title={pinned ? "Pinned — click to unpin" : "Pin to board"}
          aria-label={pinned ? `Unpin ${pid}` : `Pin ${pid}`}
          aria-pressed={pinned}
        >
          {pinned ? <Hammer className="text-[13px]" /> : <Pin className="size-3.5" />}
        </Button>
      )}
      {onDelete && (
        <Button
          variant="outline"
          size="icon"
          className="size-7 hover:bg-status-danger-bg hover:border-destructive hover:text-status-danger-txt"
          onClick={() => onDelete(pid)}
          title="Delete"
          aria-label={`Delete ${pid}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

/** A compact project line: pid · name/meta · custom middle · actions. Clicking the row opens the editor. */
export function ProjectRow({
  project: p,
  meta,
  children,
  pidClassName,
  ...actions
}: RowActionHandlers & { project: Project; meta: React.ReactNode; children?: React.ReactNode; pidClassName?: string }) {
  const pinned = actions.isPinned?.(p.pid) ?? false;
  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-[7px] px-1.5 border-b rounded-md transition-colors hover:bg-bg2 last:border-b-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        pinned && pinnedHighlight
      )}
      onClick={() => actions.onEdit(p.pid)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && actions.onEdit(p.pid)}
    >
      <PidBadge pid={p.pid} className={pidClassName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-foreground truncate group-hover:text-accent-foreground" title={p.name}>
            {p.name}
          </span>
          {pinned && <PinMark compact />}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-fg3 mt-px">{meta}</div>
      </div>
      {children}
      <RowActions pid={p.pid} {...actions} />
    </div>
  );
}

export function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="block text-[10px] font-semibold uppercase tracking-[.07em] text-fg3 mb-1.5">
        {label}
      </label>
      {children}
      {error && <div className="text-[10px] text-status-danger-txt mt-[3px]">{error}</div>}
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full bg-bg2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/** Pill used for filter rows (projects, notes). */
export function FilterPill({ active, onClick, children, activeClass }: { active: boolean; onClick: () => void; children: React.ReactNode; activeClass?: string }) {
  return (
    <button
      className={cn(
        "text-[11px] px-[11px] py-[3px] rounded-full border border-border bg-transparent text-fg3 cursor-pointer transition-colors hover:border-primary hover:text-accent-foreground",
        active && (activeClass ?? "bg-accent text-accent-foreground border-primary font-semibold")
      )}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
