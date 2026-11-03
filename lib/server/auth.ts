import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Me } from "@/lib/types";

export class AccessError extends Error {}

/** Who is signed in (Supabase checks the login cookie; Drizzle reads their profile). */
export async function getMe(): Promise<Me | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [p] = await getDb().select().from(schema.profiles).where(eq(schema.profiles.id, user.id)).limit(1);
  if (!p) return null;
  return { id: p.id, email: p.email, fullName: p.fullName ?? p.email, role: p.role, hodId: p.hodId };
}

export async function requireMe(): Promise<Me> {
  const me = await getMe();
  if (!me) throw new AccessError("Your session has expired — please sign in again");
  return me;
}
