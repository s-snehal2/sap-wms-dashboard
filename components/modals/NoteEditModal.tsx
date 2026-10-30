"use client";
import { useState } from "react";
import { NOTE_CATS } from "@/lib/constants";
import type { Note, NoteCat } from "@/lib/types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Field, SelectField } from "../ui";

interface Props {
  note: Note;
  onSave: (text: string, cat: NoteCat) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NoteEditModal({ note, onSave, onDelete, onClose }: Props) {
  const [text, setText] = useState(note.text);
  const [cat, setCat] = useState<NoteCat>(note.cat);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        <Field label="Category" htmlFor="en-cat">
          <SelectField id="en-cat" value={cat} onChange={(v) => setCat(v as NoteCat)} options={NOTE_CATS.map((c) => ({ value: c.id, label: c.label }))} />
        </Field>
        <Field label="Note" htmlFor="en-text">
          <Textarea id="en-text" className="bg-bg2 h-[100px] resize-y" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </Field>
        <DialogFooter className="pt-4 border-t items-center">
          <Button variant="destructive" className="mr-auto" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(text.trim(), cat)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
