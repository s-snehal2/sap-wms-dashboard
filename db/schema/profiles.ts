import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { userRole } from "./enums";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name"),
    /** Employee code, e.g. EMP1023 — unique per person (used for the default password). */
    empCode: text("emp_code").unique(),
    role: userRole("role").notNull().default("user"),
    hodId: uuid("hod_id").references((): AnyPgColumn => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("profiles_hod_id_idx").on(t.hodId),
    index("profiles_role_idx").on(t.role),
    check(
      "profiles_hod_not_self",
      sql`${t.hodId} is null or ${t.hodId} <> ${t.id}`,
    ),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
