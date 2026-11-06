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
  /** Filled in by the server: who owns it and whether the signed-in person may change it. */
  ownerId?: string;
  ownerName?: string;
  editable?: boolean;
}

export type NoteCat = "idea" | "discussion" | "issue" | "research" | "requirement";

export interface Note {
  id: string;
  cat: NoteCat;
  text: string;
  date: string;
  converted: boolean;
  projPid: string | null;
  ownerId?: string;
  ownerName?: string;
  editable?: boolean;
}

export type Priority = "critical" | "high" | "medium" | "low";

export type Role = "admin" | "hod" | "user";

/** The signed-in person (from public.profiles). */
export interface Me {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  hodId: string | null;
}

/** A person as shown on the admin "Users" page. */
export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  empCode: string | null;
  role: Role;
  hodId: string | null;
  hodName: string | null;
  teamSize: number;
  projectCount: number;
  blocked: boolean;
  lastSignIn: string | null;
  createdAt: string;
}

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
  /** Who wrote it — filled in by the server */
  author?: string;
  authorId?: string;
}

export type TabId = "dashboard" | "overview" | "projects" | "analytics" | "notes" | "pinboard";
