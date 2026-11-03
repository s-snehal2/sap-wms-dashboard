import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";
import { projects } from "./projects";

export const noteIdSeq = pgSequence("note_id_seq", {
  startWith: 1,
});

export const notes = pgTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .default(sql`'N' || lpad(nextval('note_id_seq')::text, 3, '0')`),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cat: text("cat").notNull().default("idea"),
    text: text("text").notNull().default(""),
    date: date("date", { mode: "string" })
      .notNull()
      .default(sql`current_date`),
    converted: boolean("converted").notNull().default(false),
    projPid: text("proj_pid").references(() => projects.pid, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notes_owner_id_idx").on(t.ownerId),
    index("notes_proj_pid_idx").on(t.projPid),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
