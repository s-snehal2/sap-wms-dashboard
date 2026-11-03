import type { TableName } from "@/app/actions/data";
import type { Note, Pin, Project, Remark } from "./types";

/** Which server list an item lives in, what identifies it, and whether you may change it. */
export interface TableSpec<T> {
  table: TableName;
  key: (item: T) => string;
  /** Rows the server marked view-only (e.g. a HOD looking at a team member's project). */
  editable?: (item: T) => boolean;
}

export const PROJECTS: TableSpec<Project> = { table: "projects", key: (p) => p.pid, editable: (p) => p.editable !== false };
export const NOTES: TableSpec<Note> = { table: "notes", key: (n) => n.id, editable: (n) => n.editable !== false };
export const PINS: TableSpec<Pin> = { table: "pins", key: (p) => p.pid };
export const REMARKS: TableSpec<Remark> = { table: "remarks", key: (r) => r.id };
