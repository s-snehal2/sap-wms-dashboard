"use client";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { NOTE_CATS } from "@/lib/constants";
import type { NoteCat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface Props {
  /** Return false when the note was rejected (e.g. empty). */
  onAdd: (text: string, cat: NoteCat) => boolean;
  variant: "page" | "inline";
  onCancel?: () => void;
  autoFocus?: boolean;
}

export default function NoteComposer({ onAdd, variant, onCancel, autoFocus }: Props) {
  const [text, setText] = useState("");
  const [cat, setCat] = useState<NoteCat>("idea");
  const [error, setError] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    if (onAdd(text.trim(), cat)) {
      setText("");
      setError(false);
    } else {
      setError(true);
      ref.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
    if (e.key === "Escape" && onCancel) onCancel();
  };

  const catSelect = (
    <select
      className="rounded-md border border-border bg-bg2 px-2.5 py-2 text-xs text-foreground outline-none cursor-pointer min-w-[130px] focus:border-primary"
      value={cat}
      onChange={(e) => setCat(e.target.value as NoteCat)}
      aria-label="Category"
    >
      {NOTE_CATS.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );

  const textarea = (
    <textarea
      ref={ref}
      className={cn(
        "flex-1 rounded-md border border-border bg-bg2 px-3 py-2.5 text-[13px] text-foreground font-[inherit] resize-none h-[72px] outline-none leading-relaxed transition-colors focus:border-primary",
        error && "border-destructive",
        variant === "inline" && "bg-background h-16"
      )}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={variant === "page" ? "Type your idea, discussion point, requirement or issue…" : "Type your idea, discussion point or issue…"}
      aria-label="Note text"
    />
  );

  if (variant === "inline") {
    return (
      <div className="mb-3.5 p-3.5 bg-bg2 rounded-md border">
        <div className="flex gap-2 items-start">
          {textarea}
          <div className="flex flex-col gap-1.5 shrink-0">
            {catSelect}
            <div className="flex gap-1.5">
              <Button className="flex-1" onClick={submit} title="Add note (Ctrl+Enter)">
                Add
              </Button>
              <Button variant="outline" onClick={onCancel} aria-label="Close composer">
                ✕
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4 mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.07em] text-fg3 mb-3">Add note, idea or discussion point</div>
      <div className="flex gap-2 items-start">
        {textarea}
        <div className="flex flex-col gap-1.5 shrink-0">
          {catSelect}
          <Button className="justify-center" onClick={submit} title="Add note (Ctrl+Enter)">
            <Plus className="size-3.5" /> Add Note
          </Button>
          <span className="text-[10px] text-fg3 text-center">Ctrl + Enter</span>
        </div>
      </div>
    </div>
  );
}
