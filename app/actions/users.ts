"use server";
import { count, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { AccessError, requireMe } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeEmpCode } from "@/lib/password";
import type { Me, Role, UserRow } from "@/lib/types";
import type { Result } from "./data";

const { profiles, projects } = schema;
const ROLES: Role[] = ["admin", "hod", "user"];

async function requireAdmin(): Promise<Me> {
  const me = await requireMe();
  if (me.role !== "admin") throw new AccessError("Only admins can manage users");
  return me;
}

/** Turn database / Supabase errors into a message an admin can act on. */
function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof AccessError) return { ok: false, error: e.message };
  if (e instanceof Error && e.message.includes("SUPABASE_SECRET_KEY")) return { ok: false, error: e.message };
  // Messages raised by the database rules (db/sql/0001_auth_helpers.sql) are written for people — pass them on.
  for (let err = e as { code?: string; message?: string; cause?: unknown } | undefined, i = 0; err && i < 5; err = err.cause as typeof err, i++) {
    if (err.code === "P0001" && err.message) return { ok: false, error: err.message };
    if (err.code === "42703" || err.code === "42P01")
      return { ok: false, error: "The database isn't up to date (missing column/table). Run:  pnpm db:migrate  then restart pnpm dev." };
    if (err.code === "28P01") return { ok: false, error: "Database password in DATABASE_URL is wrong (.env)." };
    if (err.code === "23505") {
      const c = String((err as { constraint_name?: string }).constraint_name ?? err.message ?? "");
      return { ok: false, error: c.includes("emp_code") ? "That employee code is already used by someone else" : "A user with that email already exists" };
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/timed out|timeout|aborted/i.test(msg)) return { ok: false, error: "Supabase didn't answer within 20 seconds — check your internet / office network, then try again." };
  if (/invalid api key|jwt|unauthorized|invalid.*key|not allowed|not_admin|forbidden/i.test(msg))
    return { ok: false, error: "SUPABASE_SECRET_KEY looks wrong — copy the *secret* (service_role) key again into .env.local and restart pnpm dev." };
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET/i.test(msg)) return { ok: false, error: "The server can't reach Supabase (" + msg + ") — check NEXT_PUBLIC_SUPABASE_URL and your network." };
  console.error(e);
  return { ok: false, error: "Something went wrong: " + msg.slice(0, 200) };
}

const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();
const cleanName = (v: unknown) => String(v ?? "").trim().slice(0, 120);
const checkRole = (v: unknown): Role => {
  if (!ROLES.includes(v as Role)) throw new AccessError("Choose a role: admin, HOD or user");
  return v as Role;
};
const checkPassword = (v: unknown) => {
  const p = String(v ?? "");
  if (p.length < 6) throw new AccessError("Password must be at least 6 characters (the name + code rule gives e.g. sneha@1023)");
  if (p.length > 72) throw new AccessError("Password is too long (72 characters max)");
  return p;
};

/** Employee code is required and must not belong to anyone else. */
async function checkEmpCode(v: unknown, selfId?: string): Promise<string> {
  const code = normalizeEmpCode(v);
  if (!code) throw new AccessError("Enter the employee code (e.g. EMP1023)");
  const [other] = await getDb().select({ id: profiles.id }).from(profiles).where(eq(profiles.empCode, code)).limit(1);
  if (other && other.id !== selfId) throw new AccessError(`Employee code ${code} is already used by someone else`);
  return code;
}

/** The HOD a person reports to must exist and have the HOD role. Admins report to nobody. */
async function checkHod(role: Role, hodId: unknown, selfId?: string): Promise<string | null> {
  if (role === "admin" || !hodId) return null;
  const id = String(hodId);
  if (id === selfId) throw new AccessError("A person can't be their own HOD");
  const [hod] = await getDb().select({ role: profiles.role }).from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!hod || hod.role !== "hod") throw new AccessError("Pick a HOD from the list (that person must have the HOD role)");
  return id;
}

/** Everyone, with their role, HOD, team size, project count and sign-in status. */
export async function listUsers(): Promise<Result<UserRow[]>> {
  try {
    await requireAdmin();
    const db = getDb();
    const [people, projCounts] = await Promise.all([
      db.select().from(profiles).orderBy(profiles.fullName),
      db.select({ ownerId: projects.ownerId, n: count() }).from(projects).groupBy(projects.ownerId),
    ]);
    const admin = createSupabaseAdminClient();
    const auth = new Map<string, { banned: boolean; last: string | null }>();
    for (let page = 1; page < 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const u of data.users) {
        const bannedUntil = (u as { banned_until?: string | null }).banned_until;
        auth.set(u.id, { banned: !!bannedUntil && new Date(bannedUntil) > new Date(), last: u.last_sign_in_at ?? null });
      }
      if (data.users.length < 1000) break;
    }
    const nameOf = new Map(people.map((p) => [p.id, p.fullName || p.email]));
    const projectsOf = new Map(projCounts.map((c) => [c.ownerId, Number(c.n)]));
    return {
      ok: true,
      data: people.map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.fullName ?? "",
        empCode: p.empCode ?? null,
        role: p.role,
        hodId: p.hodId,
        hodName: p.hodId ? nameOf.get(p.hodId) ?? null : null,
        teamSize: people.filter((x) => x.hodId === p.id).length,
        projectCount: projectsOf.get(p.id) ?? 0,
        blocked: auth.get(p.id)?.banned ?? false,
        lastSignIn: auth.get(p.id)?.last ?? null,
        createdAt: new Date(p.createdAt).toISOString(),
      })),
    };
  } catch (e) {
    return fail(e);
  }
}

/** Create a login account and set its role/HOD in one go. They can sign in straight away. */
export async function createUser(input: { email: string; password: string; fullName: string; empCode: string; role: Role; hodId?: string | null }): Promise<Result<string>> {
  let createdId: string | null = null;
  try {
    await requireAdmin();
    const admin = createSupabaseAdminClient();
    const email = cleanEmail(input.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError("Enter a valid email address");
    const fullName = cleanName(input.fullName);
    if (!fullName) throw new AccessError("Enter the person's name");
    const password = checkPassword(input.password);
    const role = checkRole(input.role);
    // Independent checks run at the same time (fewer round trips to the database).
    const [empCode, hodId] = await Promise.all([checkEmpCode(input.empCode), checkHod(role, input.hodId)]);

    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) {
      const m = (error?.message ?? "").toLowerCase();
      if (m.includes("already") && m.includes("registered")) throw new AccessError("A user with that email already exists");
      if (m.includes("database error")) throw new AccessError("The database refused this email — it must use your company domain (see db/sql/0001_auth_helpers.sql)");
      if (error && /invalid api key|jwt|not authorized|unauthorized|bad_jwt|not allowed|not_admin|forbidden/i.test(error.message))
        throw new AccessError("SUPABASE_SECRET_KEY looks wrong — copy the *secret* (service_role) key again into .env.local and restart pnpm dev.");
      throw new AccessError(error?.message ?? "Could not create the user");
    }
    createdId = data.user.id;
    // The sign-up trigger created the profile as "user"; now apply the chosen role, HOD and name.
    await getDb().update(profiles).set({ role, hodId, fullName, empCode }).where(eq(profiles.id, createdId));
    return { ok: true, data: createdId };
  } catch (e) {
    if (createdId) await createSupabaseAdminClient().auth.admin.deleteUser(createdId).catch(() => {}); // don't leave a half-made account
    return fail(e);
  }
}

/** Change someone's name, role or HOD. */
export async function updateUser(input: { id: string; fullName: string; empCode: string; role: Role; hodId: string | null }): Promise<Result> {
  try {
    const me = await requireAdmin();
    const id = String(input.id);
    const role = checkRole(input.role);
    if (id === me.id && role !== "admin") throw new AccessError("You can't remove your own admin role — ask another admin");
    const fullName = cleanName(input.fullName);
    if (!fullName) throw new AccessError("Name can't be empty");
    const hodId = await checkHod(role, input.hodId, id);
    const empCode = await checkEmpCode(input.empCode, id);
    const res = await getDb().update(profiles).set({ fullName, empCode, role, hodId }).where(eq(profiles.id, id)).returning({ id: profiles.id });
    if (!res.length) throw new AccessError("User not found");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function setPassword(id: string, password: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(String(id), { password: checkPassword(password) });
    if (error) throw new AccessError(error.message);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/** Block = can't sign in any more, but all their projects stay. Reversible. */
export async function setBlocked(id: string, blocked: boolean): Promise<Result> {
  try {
    const me = await requireAdmin();
    if (String(id) === me.id) throw new AccessError("You can't block yourself");
    const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(String(id), { ban_duration: blocked ? "876000h" : "none" });
    if (error) throw new AccessError(error.message);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/** Permanently delete the account AND everything they own (projects, notes, pins, remarks). */
export async function deleteUser(id: string): Promise<Result> {
  try {
    const me = await requireAdmin();
    const target = String(id);
    if (target === me.id) throw new AccessError("You can't delete your own account");
    const [p] = await getDb().select({ role: profiles.role }).from(profiles).where(eq(profiles.id, target)).limit(1);
    if (!p) throw new AccessError("User not found");
    if (p.role === "admin") throw new AccessError("Change this person's role from admin first");
    const team = await getDb().select({ id: profiles.id }).from(profiles).where(eq(profiles.hodId, target)).limit(1);
    if (team.length) throw new AccessError("Move this HOD's team members to another HOD first");
    const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(target);
    if (error) throw new AccessError(error.message);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
