"use client";
import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, MessageSquare, X } from "lucide-react";
import type { Remark } from "@/lib/types";

/** e.g. "30 Oct 2026, 2:45 pm" */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

interface Props {
  pid: string;
  remarks: Remark[];
  onAdd: (pid: string, text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Expanded remarks area under a project row: type + Enter to add, newest first. */
export default function RemarksPanel({ pid, remarks, onAdd, onDelete, onClose }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(pid, t);
    setText("");
  };

  const sorted = [...remarks].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="px-2 py-3 bg-bg2 rounded-md border animate-in fade-in slide-in-from-top-1 duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="relative flex-1">
          <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-fg3" />
          <input
            ref={ref}
            className="w-full pl-8 pr-24 py-2 rounded-md border border-border bg-background text-xs outline-none focus:border-primary"
            placeholder={`Add a remark for ${pid} and press Enter…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") onClose();
            }}
            aria-label={`Add remark for ${pid}`}
            maxLength={500}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] text-fg3 pointer-events-none">
            Enter <CornerDownLeft className="size-3" />
          </span>
        </div>
        <button className="text-[11px] text-fg3 hover:text-foreground px-2" onClick={onClose}>
          Close
        </button>
      </div>

      {sorted.length ? (
        <ul className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
          {sorted.map((r) => (
            <li key={r.id} className="group flex items-start gap-2 bg-card border rounded-md px-2.5 py-2 animate-in fade-in duration-200">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground whitespace-pre-wrap break-words">{r.text}</div>
                <div className="text-[10px] text-fg3 mt-0.5">{formatDateTime(r.at)}</div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-fg3 hover:text-status-danger-txt transition-opacity"
                onClick={() => onDelete(r.id)}
                title="Delete remark"
                aria-label="Delete remark"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-fg3 px-1">No remarks yet — the first one you add appears here with today&apos;s date and time.</div>
      )}
    </div>
  );
}
