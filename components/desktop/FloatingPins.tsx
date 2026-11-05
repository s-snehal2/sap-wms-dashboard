"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, ExternalLink, PinOff } from "lucide-react";

import { NOTE_CATS, NOTE_DOT_COLORS, PIN_EMOJI, PRIORITY_BADGE_CLASS, PRIORITY_ORDER, statusColor } from "@/lib/constants";
import type { Note, NoteCat, Pin, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bar, PidBadge, StatusBadge } from "../ui";

interface Props {
  win: Window;
  pins: Pin[];
  projects: Project[];
  notes: Note[];
  onOpen: (pid: string) => void;
  onUnpin: (pid: string) => void;
  /** Same function the Notes tab uses: returns true when the note was accepted. */
  onAddNote: (text: string, cat: NoteCat) => boolean;
  onOpenNote: (id: string) => void;
}

type Tab = "pins" | "notes";

/** The small always-on-top desktop window: pinned projects + notes, updating live. */
export default function FloatingPins({ win, pins, projects, notes, onOpen, onUnpin, onAddNote, onOpenNote }: Props) {
  const [tab, setTab] = useState<Tab>("pins");
  const [text, setText] = useState("");
  const [cat, setCat] = useState<NoteCat>("idea");

  const byPid = new Map(projects.map((p) => [p.pid, p]));
  const pinList = pins
    .map((pin) => ({ pin, proj: byPid.get(pin.pid) }))
    .filter((x): x is { pin: Pin; proj: Project } => !!x.proj)
    .sort((a, b) => PRIORITY_ORDER[a.pin.priority] - PRIORITY_ORDER[b.pin.priority] || b.proj.pct - a.proj.pct);
  // Open notes first, newest first (IDs grow over time: N001, N002…).
  const noteList = [...notes].sort((a, b) => Number(a.converted) - Number(b.converted) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const openNotes = notes.filter((n) => !n.converted).length;

  /** Bring the main dashboard to the front (and optionally open something there). */
  const toDashboard = (fn?: () => void) => {
    window.focus();
    fn?.();
  };

  const addNote = () => {
    const t = text.trim();
    if (!t) return;
    if (onAddNote(t, cat)) setText("");
  };

  const tabBtn = (id: Tab, label: string, count: number) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        "flex-1 py-2 text-[12px] font-medium border-b-2 transition-colors",
        tab === id ? "border-primary text-foreground" : "border-transparent text-fg3 hover:text-fg2"
      )}
      aria-pressed={tab === id}
    >
      {label} <span className="text-fg3 font-normal">({count})</span>
    </button>
  );

  return createPortal(
    <div className="min-h-screen bg-background text-foreground text-xs flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <span className="text-[11px] font-semibold text-fg2">SAP / WMS</span>
          <button className="inline-flex items-center gap-1 text-[11px] text-fg2 hover:text-accent-foreground" onClick={() => toDashboard()} title="Bring the dashboard to the front">
            Dashboard <ExternalLink className="size-3" />
          </button>
        </div>
        <div className="flex px-1">
          {tabBtn("pins", `${PIN_EMOJI} Pinned`, pinList.length)}
          {tabBtn("notes", "📝 Notes", openNotes)}
        </div>
      </div>

      {tab === "pins" &&
        (pinList.length === 0 ? (
          <div className="text-center text-fg3 px-6 py-12 leading-relaxed">
            <div className="text-3xl mb-2 opacity-50">{PIN_EMOJI}</div>
            Nothing pinned yet.
            <br />
            Pin a project in the dashboard and it appears here instantly.
          </div>
        ) : (
          <ul className="p-2 flex flex-col gap-1.5">
            {pinList.map(({ pin, proj }) => (
              <li
                key={pin.pid}
                className="group rounded-md border bg-card px-2.5 py-2 cursor-pointer hover:border-primary transition-colors"
                style={{ borderLeft: `3px solid ${statusColor(proj.status)}` }}
                onClick={() => toDashboard(() => onOpen(proj.pid))}
                title="Open in dashboard"
              >
                <div className="flex items-center gap-1.5 mb-1">
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
        ))}

      {tab === "notes" && (
        <>
          {/* Quick add: type, pick a category, Enter */}
          <div className="p-2 border-b bg-bg2">
            <textarea
              className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-[12px] outline-none focus:border-primary resize-none"
              rows={2}
              placeholder="Write a note… (Enter to save, Shift+Enter for a new line)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addNote();
                }
              }}
              aria-label="New note"
              maxLength={4000}
            />
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {NOTE_CATS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                    cat === c.id ? "border-primary bg-accent text-accent-foreground font-semibold" : "border-border text-fg3 hover:border-primary"
                  )}
                  aria-pressed={cat === c.id}
                >
                  <span className="size-[7px] rounded-full" style={{ background: NOTE_DOT_COLORS[c.id] }} />
                  {c.label}
                </button>
              ))}
              <button
                onClick={addNote}
                disabled={!text.trim()}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              >
                Add <CornerDownLeft className="size-3" />
              </button>
            </div>
          </div>

          {noteList.length === 0 ? (
            <div className="text-center text-fg3 px-6 py-10 leading-relaxed">
              <div className="text-3xl mb-2 opacity-50">📝</div>
              No notes yet — type one above.
            </div>
          ) : (
            <ul className="p-2 flex flex-col gap-1.5">
              {noteList.map((n) => (
                <li
                  key={n.id}
                  className={cn("rounded-md border bg-card px-2.5 py-2 cursor-pointer hover:border-primary transition-colors", n.converted && "opacity-55")}
                  style={{ borderLeft: `3px solid ${NOTE_DOT_COLORS[n.cat]}` }}
                  onClick={() => toDashboard(() => onOpenNote(n.id))}
                  title={n.converted ? "Became a project — click to open it" : "Click to edit in the dashboard"}
                >
                  <div className="text-[12px] leading-snug whitespace-pre-wrap break-words line-clamp-4">{n.text}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-fg3">
                    <span className="capitalize" style={{ color: NOTE_DOT_COLORS[n.cat] }}>
                      {n.cat}
                    </span>
                    <span>· {n.date}</span>
                    {n.ownerName && n.editable === false && <span>· {n.ownerName}</span>}
                    {n.converted && <span className="ml-auto">→ {n.projPid}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>,
    win.document.body
  );
}
