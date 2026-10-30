"use client";
import { useState } from "react";
import { Bell, BellOff, FileText, Pencil, PictureInPicture2, Pin, PinOff, Search } from "lucide-react";
import { PIN_EMOJI, PRIORITIES, PRIORITY_BADGE_CLASS, PRIORITY_ORDER, statusColor } from "@/lib/constants";
import type { Pin as PinType, Priority, Project, Quarter } from "@/lib/types";
import { cn, qOf, typeClass } from "@/lib/utils";
import QuarterSummary from "./QuarterSummary";
import { Badge, Bar, Hammer, PidBadge, QBadge, StatusBadge, cardHd, clickProps, clickableCard, stop } from "./ui";
import { Button } from "./ui/button";

interface Props {
  pins: PinType[];
  projects: Project[];
  onAddPin: () => void;
  onEditPin: (pid: string) => void;
  onEditProject: (pid: string) => void;
  onUnpin: (pid: string) => void;
  onSetPriority: (pid: string, p: Priority) => void;
  /** Clicking a quarter card shows that quarter's pinned projects. */
  onQuarter: (q: Quarter) => void;
  /* desktop */
  floatingOpen: boolean;
  onToggleFloating: () => void;
  remindersOn: boolean;
  onToggleReminders: () => void;
}

type SortKey = "priority" | "progress" | "added";

const pinActBtn =
  "size-6 rounded-md border border-border bg-transparent cursor-pointer flex items-center justify-center text-fg3 transition-colors hover:border-border-strong hover:text-fg2";

export default function PinBoardView(props: Props) {
  const { pins, projects, onAddPin, onEditPin, onEditProject, onUnpin, onSetPriority } = props;
  const [sort, setSort] = useState<SortKey>("priority");
  const [query, setQuery] = useState("");

  const byPid = new Map(projects.map((p) => [p.pid, p]));
  const pinnedProjects = pins.map((pin) => byPid.get(pin.pid)).filter((p): p is Project => !!p);
  const q = query.toLowerCase();

  const list = pins
    .map((pin) => ({ pin, proj: byPid.get(pin.pid) }))
    .filter((x): x is { pin: PinType; proj: Project } => !!x.proj)
    .filter(({ proj, pin }) => !q || `${proj.name} ${proj.pid} ${proj.type} ${pin.note}`.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === "priority") return (PRIORITY_ORDER[a.pin.priority] ?? 2) - (PRIORITY_ORDER[b.pin.priority] ?? 2);
      if (sort === "progress") return b.proj.pct - a.proj.pct;
      return b.pin.addedAt.localeCompare(a.pin.addedAt);
    });

  return (
    <>
      {/* Desktop bar: the bridge to the user's computer */}
      <div className="mb-5 rounded-lg border border-amber-300/70 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 flex items-center gap-3 flex-wrap">
        <Hammer className="text-xl" />
        <div className="flex-1 min-w-[200px]">
          <div className="text-[13px] font-medium">Keep your pinned work on the desktop</div>
          <div className="text-[11px] text-fg2">Float a small always-on-top window over your other apps, and get desktop reminders using each pin&apos;s remind interval.</div>
        </div>
        <Button variant={props.floatingOpen ? "default" : "outline"} size="sm" onClick={props.onToggleFloating}>
          <PictureInPicture2 className="size-3.5" /> {props.floatingOpen ? "Close floating window" : "Pop out on desktop"}
        </Button>
        <Button variant={props.remindersOn ? "default" : "outline"} size="sm" onClick={props.onToggleReminders}>
          {props.remindersOn ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />} Reminders {props.remindersOn ? "on" : "off"}
        </Button>
      </div>

      {pinnedProjects.length > 0 && (
        <div className="mb-5">
          <div className={`${cardHd} mb-2.5`}>Quarter-wise Pinned Summary</div>
          <QuarterSummary projects={pinnedProjects} compact unit="pinned" onToggle={(q) => q && props.onQuarter(q)} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-fg3" />
            <input
              className="w-40 pl-7 pr-2.5 py-1.5 rounded-md border border-border bg-bg2 text-xs text-foreground outline-none transition-all focus:w-48 focus:border-primary"
              placeholder="Filter pinned…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter pinned projects"
            />
          </div>
          <select
            className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-bg2 text-fg2 outline-none cursor-pointer"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort pins"
          >
            <option value="priority">Sort: Priority</option>
            <option value="progress">Sort: Progress</option>
            <option value="added">Sort: Recently pinned</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-fg3">
            {pinnedProjects.length} pinned
          </span>
          <Button onClick={onAddPin}>
            <Pin className="size-3.5" /> Pin a Project
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="text-[48px] mb-4 opacity-40">
            <Hammer />
          </div>
          <div className="text-[15px] font-medium text-foreground mb-1.5">{pinnedProjects.length === 0 ? "Your Pin Board is empty" : "No results match your search"}</div>
          <div className="text-[13px] text-fg3 leading-relaxed">
            {pinnedProjects.length === 0 ? (
              <>
                Click the pin button on any project row — it turns into {PIN_EMOJI} and shows up here.
                <br />
                <Button onClick={onAddPin} className="mt-4">
                  Pin your first project
                </Button>
              </>
            ) : (
              "Try a different search term"
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {list.map(({ pin, proj }, i) => {
            const accent = statusColor(proj.status);
            return (
              <div
                key={pin.pid}
                className={cn("group bg-card border rounded-lg overflow-hidden relative animate-in fade-in slide-in-from-top-2 duration-300", clickableCard)}
                style={{ animationDelay: `${i * 50}ms` }}
                title="Click to open this project"
                {...clickProps(() => onEditProject(proj.pid), `Open ${proj.pid}`)}
              >
                <div className="h-1 w-full" style={{ background: accent }} />
                <div className="px-[18px] py-4">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Hammer className="text-[15px]" delay={i * 150} />
                      <PidBadge pid={proj.pid} />
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={stop} onKeyDown={stop}>
                      <button className={cn(pinActBtn, "hover:bg-accent hover:border-primary hover:text-accent-foreground")} onClick={() => onEditPin(proj.pid)} title="Edit pin" aria-label="Edit pin">
                        <Pencil className="size-2.5" />
                      </button>
                      <button className={cn(pinActBtn, "text-accent-foreground")} onClick={() => onEditProject(proj.pid)} title="Edit project" aria-label="Edit project">
                        <FileText className="size-2.5" />
                      </button>
                      <button className={cn(pinActBtn, "hover:bg-status-danger-bg hover:border-destructive hover:text-status-danger-txt")} onClick={() => onUnpin(proj.pid)} title="Unpin" aria-label="Unpin">
                        <PinOff className="size-2.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[13px] font-medium text-foreground leading-[1.45] mb-2 group-hover:text-accent-foreground">{proj.name}</div>
                  <div className="flex flex-wrap gap-1.5 items-center mb-3.5">
                    <StatusBadge status={proj.status} />
                    <Badge cls={typeClass(proj.type)}>{proj.type}</Badge>
                    <QBadge q={qOf(proj)} />
                    <span className="text-[10px] text-fg3">
                      {proj.plant} · {proj.sys}
                    </span>
                  </div>
                  <div className="mb-3.5">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[11px] text-fg3">Progress</span>
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: accent }}>
                        {proj.pct}%
                      </span>
                    </div>
                    <Bar pct={proj.pct} color={accent} className="h-[7px] flex-none" />
                  </div>
                  {proj.notes && (
                    <div className="text-[11px] text-fg2 bg-bg2 rounded-md px-2.5 py-[7px] border-l-[3px] border-primary leading-relaxed mt-2 italic line-clamp-3" title={proj.notes}>
                      {proj.notes}
                    </div>
                  )}
                  {pin.note && <div className="mt-2 text-[11px] text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-500/15 rounded-md px-2.5 py-1.5 leading-relaxed">{PIN_EMOJI} {pin.note}</div>}
                </div>
                <div className="flex items-center justify-between px-[18px] py-2.5 border-t bg-bg2">
                  <span className="text-[10px] text-fg3">
                    Pinned {pin.addedAt} · {pin.remind || "weekly"}
                  </span>
                  {/* Priority can be changed right here — no modal needed */}
                  <select
                    onClick={stop}
                    onKeyDown={stop}
                    className={cn("text-[9px] font-bold uppercase tracking-[.07em] px-2 py-0.5 rounded-full border-none outline-none cursor-pointer appearance-none text-center", PRIORITY_BADGE_CLASS[pin.priority])}
                    value={pin.priority}
                    onChange={(e) => onSetPriority(pin.pid, e.target.value as Priority)}
                    aria-label="Change priority"
                    title="Change priority"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
