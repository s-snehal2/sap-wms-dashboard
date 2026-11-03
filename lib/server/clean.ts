import type { NoteCat, Priority } from "@/lib/types";

/** Clean values coming from the browser before they reach the database. */
export const str = (v: unknown, max = 2000, d = "") => (v == null ? d : String(v).slice(0, max));
export const int = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
const isoDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10));
export const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const NOTE_CATS = ["idea", "discussion", "issue", "research", "requirement"] as const satisfies readonly NoteCat[];
const PRIORITIES = ["critical", "high", "medium", "low"] as const satisfies readonly Priority[];

export const cleanProject = (p: Record<string, unknown>) => ({
  sr: int(p.sr, 0, 1_000_000),
  name: str(p.name, 500).trim() || "Untitled project",
  type: str(p.type, 60),
  plant: str(p.plant, 60),
  sys: str(p.sys, 60),
  mod: str(p.mod, 60),
  phase: str(p.phase, 60),
  status: str(p.status, 60, "Open") || "Open",
  pct: int(p.pct, 0, 100),
  notes: str(p.notes, 4000),
  quarter: str(p.quarter, 10),
});

export const cleanNote = (n: Record<string, unknown>) => ({
  cat: oneOf(n.cat, NOTE_CATS, "idea"),
  text: str(n.text, 4000),
  date: isoDate(n.date),
  converted: !!n.converted,
});

export const cleanPin = (p: Record<string, unknown>) => ({
  priority: oneOf(p.priority, PRIORITIES, "high"),
  note: str(p.note, 1000),
  remind: oneOf(p.remind, ["daily", "weekly", "always"] as const, "weekly"),
  addedAt: isoDate(p.addedAt),
});
