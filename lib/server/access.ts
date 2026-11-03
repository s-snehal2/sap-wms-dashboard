import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import type { Me } from "@/lib/types";

/*
 * The access rules (these replace the old RLS policies):
 *   user  → their own rows
 *   hod   → their own rows + rows of people whose hod_id is them (VIEW ONLY)
 *   admin → everything, full edit
 * Pins are always personal. Remarks: anyone who can see the project may add one;
 * the author or an admin may delete it.
 */

/** Owner ids whose data `me` may see, or "all" for admins. */
export async function visibleOwnerIds(me: Me): Promise<string[] | "all"> {
  if (me.role === "admin") return "all";
  if (me.role !== "hod") return [me.id];
  const team = await getDb().select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.hodId, me.id));
  return [me.id, ...team.map((t) => t.id)];
}

export const canSeeOwner = (visible: string[] | "all", ownerId: string) => visible === "all" || visible.includes(ownerId);

/** Change / delete a project or note: the owner, or an admin. */
export const canEditOwner = (me: Me, ownerId: string) => me.role === "admin" || ownerId === me.id;

/** Delete a remark: its author, or an admin. */
export const canDeleteRemark = (me: Me, authorId: string) => me.role === "admin" || authorId === me.id;
