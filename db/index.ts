import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { relations } from "./schema/relations";

/*
 * Server-only database connection (Supabase transaction pooler, port 6543 → prepare: false).
 * There is no RLS: every query here runs with full access, so ONLY call this from server code
 * that has already checked permissions (see lib/server/access.ts). Never import it in "use client" files.
 */
const ssl = process.env.DATABASE_SSL === "false" ? false : ("require" as const);

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — add it to .env (see .env.example)");
  const sql = postgres(connectionString, { max: 4, prepare: false, ssl, idle_timeout: 20 });
  return { sql, db: drizzle({ client: sql, relations }) };
}

type Conn = ReturnType<typeof createDb>;
const g = globalThis as unknown as { __sapWmsDb?: Conn };

/** One connection pool, created on first use (and reused across hot reloads in dev). */
export function getConn(): Conn {
  return (g.__sapWmsDb ??= createDb());
}
export const getDb = () => getConn().db;

export { schema };
