"use client";
import { NOTE_CATS, NOTE_PILL_CLASS } from "@/lib/constants";
import type { Note, NoteCat } from "@/lib/types";
import NoteCard from "./NoteCard";
import NoteComposer from "./NoteComposer";
import { FilterPill } from "./ui";

interface Props {
  notes: Note[];
  filter: NoteCat | "all";
  onFilter: (f: NoteCat | "all") => void;
  onAdd: (text: string, cat: NoteCat) => boolean;
  onEdit: (id: string) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NotesView({ notes, filter, onFilter, onAdd, onEdit, onConvert, onDelete }: Props) {
  const shown = (filter === "all" ? notes : notes.filter((n) => n.cat === filter)).slice().reverse();
  const cats = [{ id: "all" as const, label: "All" }, ...NOTE_CATS];

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {cats.map((c) => (
            <FilterPill key={c.id} active={filter === c.id} activeClass={`font-semibold ${NOTE_PILL_CLASS[c.id]}`} onClick={() => onFilter(c.id)}>
              {c.label}
            </FilterPill>
          ))}
        </div>
        <span className="text-[11px] text-fg3 px-2.5 py-1 rounded-full bg-bg2 border">
          {shown.length} note{shown.length !== 1 ? "s" : ""}
        </span>
      </div>

      <NoteComposer variant="page" onAdd={onAdd} />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
        {shown.length ? (
          shown.map((n, i) => (
            <NoteCard key={n.id} note={n} delay={i * 40} onEdit={onEdit} onConvert={onConvert} onDelete={onDelete} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-fg3 text-[13px]">
            No {filter === "all" ? "notes" : "notes in this category"} yet.
            <br />
            <span className="text-xs">Type above and click &quot;Add Note&quot; to get started.</span>
          </div>
        )}
      </div>
    </>
  );
}
