export type Status = "Done" | "WIP" | "Parked" | "Open";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface Project {
  pid: string;
  sr: number;
  name: string;
  type: string;
  plant: string;
  sys: string;
  mod: string;
  phase: string;
  status: string;
  pct: number;
  notes: string;
  quarter: string;
}

export type NoteCat = "idea" | "discussion" | "issue" | "research" | "requirement";

export interface Note {
  id: string;
  cat: NoteCat;
  text: string;
  date: string;
  converted: boolean;
  projPid: string | null;
}

export type Priority = "critical" | "high" | "medium" | "low";

export interface Pin {
  pid: string;
  priority: Priority;
  note: string;
  remind: string;
  addedAt: string;
}

/** A timestamped comment on a project. */
export interface Remark {
  id: string;
  pid: string;
  text: string;
  /** ISO date-time when it was added */
  at: string;
}

export type TabId = "overview" | "projects" | "analytics" | "notes" | "pinboard";
