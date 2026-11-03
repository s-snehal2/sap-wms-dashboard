import { createClient } from "@supabase/supabase-js";

/*
 * Supabase ADMIN client — can create users, set passwords, block accounts.
 * Uses the SECRET key (Supabase → Project Settings → API Keys → "secret" / legacy "service_role").
 * SERVER ONLY: never import this from a "use client" file, never prefix the key with NEXT_PUBLIC_.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not set — add it to .env.local (server only, no NEXT_PUBLIC_ prefix)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
