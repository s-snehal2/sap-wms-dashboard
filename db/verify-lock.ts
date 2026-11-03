import "dotenv/config";

import postgres from "postgres";

/*
 * `pnpm db:verify` — checks the database is set up the way the app expects:
 *   • RLS is OFF on every app table
 *   • Supabase's public API roles (anon / authenticated) have NO access to the tables
 *   • the sign-up trigger is installed
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "false" ? false : "require",
});

const TABLES = ["profiles", "projects", "notes", "pins", "remarks"];

async function main() {
  let failures = 0;
  const check = (ok: boolean, msg: string) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
    if (!ok) failures++;
  };
  try {
    const rls = await sql`select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relname in ${sql(TABLES)}`;
    check(rls.length === TABLES.length, `all ${TABLES.length} tables exist`);
    for (const r of rls) check(!r.relrowsecurity, `RLS is off on ${r.relname}`);

    const policies = await sql`select count(*)::int as n from pg_policies where schemaname = 'public'`;
    check(policies[0].n === 0, "no RLS policies left");

    for (const role of ["anon", "authenticated"]) {
      const hasRole = await sql`select 1 from pg_roles where rolname = ${role}`;
      if (!hasRole.length) continue;
      for (const t of TABLES) {
        const [g] = await sql`select has_table_privilege(${role}, ${"public." + t}, 'SELECT')
          or has_table_privilege(${role}, ${"public." + t}, 'INSERT')
          or has_table_privilege(${role}, ${"public." + t}, 'UPDATE')
          or has_table_privilege(${role}, ${"public." + t}, 'DELETE') as allowed`;
        check(!g.allowed, `Supabase API role "${role}" cannot touch ${t}`);
      }
    }

    const trig = await sql`select 1 from pg_trigger where tgname = 'on_auth_user_created'`;
    check(trig.length === 1, "sign-up trigger (on_auth_user_created) is installed");
  } finally {
    await sql.end();
  }
  console.log(failures ? `\n${failures} check(s) failed — run: pnpm db:setup` : "\nDatabase is set up correctly.");
  if (failures) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
