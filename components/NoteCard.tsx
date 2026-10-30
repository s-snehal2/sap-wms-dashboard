"use client";
import { Check } from "lucide-react";
import { NOTE_CARD_CLASS, NOTE_TAG_CLASS } from "@/lib/constants";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clickProps, clickableCard, stop } from "./ui";

interface Props {
  note: Note;
  delay?: number;
  onEdit: (id: string) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
}

const noteBtn =
  "text-[10px] px-2 py-[3px] rounded-md border-none cursor-pointer font-medium transition-colors bg-black/[0.07] text-fg2 hover:bg-black/[0.14] dark:bg-white/10 dark:hover:bg-white/20";

export default function NoteCard({ note: n, delay = 0, onEdit, onConvert, onDelete }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 flex flex-col gap-2 border animate-in fade-in zoom-in-95 duration-200",
        NOTE_CARD_CLASS[n.cat],
        clickableCard
      )}
      style={{ animationDelay: `${delay}ms` }}
      title={n.converted ? `Click to open ${n.projPid ?? "the project"}` : "Click to edit"}
      {...clickProps(() => onEdit(n.id))}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-[9px] font-bold uppercase tracking-[.09em] opacity-70", NOTE_TAG_CLASS[n.cat])}>{n.cat}</span>
        {n.converted && (
          <span className="text-[9px] font-bold uppercase tracking-[.07em] text-status-done flex items-center gap-1">
            <Check className="size-2.5" />
            Converted
          </span>
        )}
      </div>
      <div className={cn("text-[12.5px] leading-relaxed text-foreground flex-1 break-words", n.converted && "line-through opacity-55")}>
        {n.text}
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] opacity-55 text-fg2">{n.date}</span>
        <div className="flex gap-1" onClick={stop} onKeyDown={stop}>
          {n.converted ? (
            <>
              {n.projPid && (
                <span className="text-[10px] px-[7px] py-0.5 rounded-full bg-status-done-bg text-status-done-txt">{n.projPid}</span>
              )}
              <button className={noteBtn} onClick={() => onDelete(n.id)} aria-label="Delete note">
                ✕
              </button>
            </>
          ) : (
            <>
              <button className={noteBtn} onClick={() => onEdit(n.id)}>
                Edit
              </button>
              <button className={cn(noteBtn, "bg-black/[0.12] text-foreground dark:bg-white/15 hover:bg-primary hover:text-white")} onClick={() => onConvert(n.id)}>
                → Project
              </button>
              <button className={noteBtn} onClick={() => onDelete(n.id)} aria-label="Delete note">
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
