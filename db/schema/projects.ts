import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";

export const projectPidSeq = pgSequence("project_pid_seq", {
  startWith: 1,
});

export const projects = pgTable(
  "projects",
  {
    pid: text("pid")
      .primaryKey()
      .default(
        sql`'CMC' || lpad(nextval('project_pid_seq')::text, 4, '0')`,
      ),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sr: integer("sr").notNull().default(0),
    name: text("name").notNull(),
    type: text("type").notNull().default(""),
    plant: text("plant").notNull().default(""),
    sys: text("sys").notNull().default(""),
    mod: text("mod").notNull().default(""),
    phase: text("phase").notNull().default(""),
    status: text("status").notNull().default("Open"),
    pct: integer("pct").notNull().default(0),
    notes: text("notes").notNull().default(""),
    quarter: text("quarter").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("projects_owner_id_idx").on(t.ownerId),
    index("projects_status_idx").on(t.status),
    index("projects_quarter_idx").on(t.quarter),
    check("projects_pct_range", sql`${t.pct} >= 0 and ${t.pct} <= 100`),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
