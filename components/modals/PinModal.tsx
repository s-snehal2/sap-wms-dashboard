"use client";
import { useState } from "react";
import { PRIORITIES, REMIND_OPTIONS } from "@/lib/constants";
import type { Pin as PinType, Priority, Project } from "@/lib/types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Field, Hammer, SelectField } from "../ui";

interface Props {
  project: Project;
  existing?: PinType;
  onSave: (data: { priority: Priority; remind: string; note: string }) => void;
  onUnpin: () => void;
  onClose: () => void;
}

export default function PinModal({ project: p, existing, onSave, onUnpin, onClose }: Props) {
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? "high");
  const [remind, setRemind] = useState(existing?.remind ?? "weekly");
  const [note, setNote] = useState(existing?.note ?? "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer /> {existing ? "Pin details" : "Pin to Board"}
          </DialogTitle>
        </DialogHeader>
        <div className="bg-bg2 rounded-md px-3 py-2.5 mb-4 border">
          <div className="text-[10px] text-fg3 mb-1">Pinning project</div>
          <div className="text-[13px] font-medium text-foreground leading-snug">{p.name}</div>
          <div className="text-[11px] text-fg3 mt-[3px]">
            {p.pid} · {p.type} · {p.plant} · {p.sys}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Priority" htmlFor="pin-priority">
            <SelectField
              id="pin-priority"
              value={priority}
              onChange={(v) => setPriority(v as Priority)}
              options={PRIORITIES}
            />
          </Field>
          <Field label="Desktop reminder" htmlFor="pin-remind">
            <SelectField
              id="pin-remind"
              value={remind}
              onChange={setRemind}
              options={REMIND_OPTIONS}
            />
          </Field>
        </div>
        <Field label="Pin note (optional)" htmlFor="pin-note">
          <Textarea
            id="pin-note"
            className="bg-bg2 h-[72px] resize-y"
            placeholder="Why is this pinned? What to monitor or action… (Ctrl+Enter to save)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && onSave({ priority, remind, note: note.trim() })}
            autoFocus
          />
        </Field>
        <DialogFooter className="pt-4 border-t items-center">
          {existing && (
            <Button variant="destructive" className="mr-auto" onClick={onUnpin}>
              Unpin
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ priority, remind, note: note.trim() })}>{existing ? "Update Pin" : "Pin to Board"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
