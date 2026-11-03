import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";
import { projects } from "./projects";

export const pins = pgTable(
  "pins",
  {
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    pid: text("pid")
      .notNull()
      .references(() => projects.pid, { onDelete: "cascade" }),
    priority: text("priority").notNull().default("high"),
    note: text("note").notNull().default(""),
    remind: text("remind").notNull().default("weekly"),
    addedAt: date("added_at", { mode: "string" })
      .notNull()
      .default(sql`current_date`),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.pid] }),
    index("pins_pid_idx").on(t.pid),
  ],
);

export type Pin = typeof pins.$inferSelect;
export type NewPin = typeof pins.$inferInsert;
