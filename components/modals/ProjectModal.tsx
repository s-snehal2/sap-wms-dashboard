"use client";
import { useEffect, useRef, useState } from "react";
import { OPTIONS, QUARTER_OPTIONS } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { Textarea } from "../ui/textarea";
import { Field, SelectField } from "../ui";

export type ProjectDraft = Omit<Project, "pid">;

interface Props {
  /** Present when editing an existing project. */
  project?: Project;
  /** Present when converting a note into a project. */
  fromNote?: { text: string; prefillName: string };
  defaultSr: number;
  onSave: (draft: ProjectDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
  onInvalid: () => void;
}

export default function ProjectModal({ project, fromNote, defaultSr, onSave, onDelete, onClose, onInvalid }: Props) {
  const [f, setF] = useState<ProjectDraft>(() => ({
    sr: project?.sr ?? defaultSr,
    name: project?.name ?? fromNote?.prefillName ?? "",
    type: project?.type ?? "Project",
    plant: project?.plant ?? "AD",
    sys: project?.sys ?? "SAP",
    mod: project?.mod ?? "PP",
    status: project?.status ?? "Open",
    phase: project?.phase ?? "Open",
    pct: project?.pct ?? 0,
    notes: project?.notes ?? fromNote?.text ?? "",
    quarter: project?.quarter || "Q1",
  }));
  const [nameErr, setNameErr] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => nameRef.current?.focus(), []);

  const set = <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    const name = f.name.trim();
    if (!name) {
      setNameErr(true);
      nameRef.current?.focus();
      onInvalid();
      return;
    }
    onSave({ ...f, name, notes: f.notes.trim(), sr: Number(f.sr) || defaultSr });
  };

  const title = project ? `Edit — ${project.pid}` : fromNote ? "Convert Note → Project" : "Add New Project";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[540px] max-h-[88vh] overflow-y-auto" onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && save()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {fromNote && (
          <div className="bg-accent border border-primary rounded-md px-3 py-2.5 mb-4 text-xs text-accent-foreground leading-relaxed">
            <strong className="text-[10px] uppercase tracking-[.07em] block mb-1 opacity-70">From note</strong>
            {fromNote.text.slice(0, 120)}
            {fromNote.text.length > 120 ? "…" : ""}
          </div>
        )}

        <Field label="Project Name *" htmlFor="f-name" error={nameErr ? "Enter a project name to save." : undefined}>
          <Input
            id="f-name"
            ref={nameRef}
            type="text"
            placeholder="Enter full project name…"
            className={cn("bg-bg2", nameErr && "border-destructive")}
            value={f.name}
            onChange={(e) => {
              set("name", e.target.value);
              setNameErr(false);
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Type" htmlFor="f-type">
            <SelectField id="f-type" value={f.type} onChange={(v) => set("type", v)} options={OPTIONS.type} />
          </Field>
          <Field label="Plant" htmlFor="f-plant">
            <SelectField id="f-plant" value={f.plant} onChange={(v) => set("plant", v)} options={OPTIONS.plant} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="System" htmlFor="f-sys">
            <SelectField id="f-sys" value={f.sys} onChange={(v) => set("sys", v)} options={OPTIONS.sys} />
          </Field>
          <Field label="Module" htmlFor="f-mod">
            <SelectField id="f-mod" value={f.mod} onChange={(v) => set("mod", v)} options={OPTIONS.mod} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Status" htmlFor="f-status">
            <SelectField id="f-status" value={f.status} onChange={(v) => set("status", v)} options={OPTIONS.status} />
          </Field>
          <Field label="Phase" htmlFor="f-phase">
            <SelectField id="f-phase" value={f.phase} onChange={(v) => set("phase", v)} options={OPTIONS.phase} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Quarter (FY 2026-27)" htmlFor="f-quarter">
            <SelectField id="f-quarter" value={f.quarter} onChange={(v) => set("quarter", v)} options={QUARTER_OPTIONS} />
          </Field>
          <Field label="Sr. No" htmlFor="f-sr">
            <Input id="f-sr" type="number" min={1} className="bg-bg2" value={f.sr} onChange={(e) => set("sr", Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Progress">
          <div className="flex items-center gap-2.5">
            <Slider value={[f.pct]} max={100} step={1} onValueChange={(v) => set("pct", v[0])} className="flex-1" />
            <span className="text-[13px] font-semibold min-w-[36px] text-right">{f.pct}%</span>
          </div>
        </Field>
        <Field label="Notes / Dependencies" htmlFor="f-notes">
          <Textarea
            id="f-notes"
            className="bg-bg2 h-16 resize-y"
            placeholder="Blockers, dependencies, working notes…"
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>

        <DialogFooter className="pt-4 border-t items-center">
          {onDelete && (
            <Button variant="destructive" className="mr-auto" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} title="Ctrl+Enter">{project ? "Save Changes" : fromNote ? "Launch as Project" : "Create Project"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
