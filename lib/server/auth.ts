import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Me } from "@/lib/types";

export class AccessError extends Error {}

/** Who is signed in (Supabase checks the login cookie; Drizzle reads their profile). */
export async function getMe(): Promise<Me | null> {
  const supabase = await createSupabaseServerClient();
  // getClaims() verifies the login token locally on projects with asymmetric signing keys (no round trip
  // to Supabase); on older projects it falls back to asking Supabase, exactly like getUser().
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return null;
  const user = { id: userId };
  const { profiles } = schema;
  // Only the columns needed here, so a pending migration elsewhere can't break signing in.
  const [p] = await getDb()
    .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName, role: profiles.role, hodId: profiles.hodId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!p) return null;
  return { id: p.id, email: p.email, fullName: p.fullName ?? p.email, role: p.role, hodId: p.hodId };
}

export async function requireMe(): Promise<Me> {
  const me = await getMe();
  if (!me) throw new AccessError("Your session has expired — please sign in again");
  return me;
}
