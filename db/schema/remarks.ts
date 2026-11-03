import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";
import { projects } from "./projects";

export const remarks = pgTable(
  "remarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pid: text("pid")
      .notNull()
      .references(() => projects.pid, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("remarks_pid_idx").on(t.pid),
    index("remarks_author_id_idx").on(t.authorId),
  ],
);

export type Remark = typeof remarks.$inferSelect;
export type NewRemark = typeof remarks.$inferInsert;
