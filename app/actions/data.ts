"use server";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { getConn, getDb, schema } from "@/db";
import { canDeleteRemark, canEditOwner, canSeeOwner, visibleOwnerIds } from "@/lib/server/access";
import { AccessError, requireMe } from "@/lib/server/auth";
import { cleanNote, cleanPin, cleanProject, isUuid, str } from "@/lib/server/clean";
import type { Note, Pin, Project, Remark } from "@/lib/types";

/*
 * Every read and write of app data goes through these functions. There is no RLS, so the
 * checks here ARE the security: each call verifies the login and the access rules first.
 */

export type TableName = "projects" | "notes" | "pins" | "remarks";
export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
type Item = Project | Note | Pin | Remark;

const { projects, notes, pins, remarks, profiles } = schema;

const fail = (e: unknown): { ok: false; error: string } => {
  if (e instanceof AccessError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Something went wrong with the database — please try again" };
};

const ownerFilter = (col: Parameters<typeof inArray>[0], visible: string[] | "all"): SQL | undefined =>
  visible === "all" ? undefined : inArray(col, visible);

/** Load one list. You get exactly the rows your role allows. */
export async function loadRows(table: TableName): Promise<Result<Item[]>> {
  try {
    const me = await requireMe();
    const visible = await visibleOwnerIds(me);
    const db = getDb();
    const ownerName = sql<string>`coalesce(${profiles.fullName}, ${profiles.email})`;

    if (table === "projects") {
      const rows = await db
        .select({ p: projects, ownerName })
        .from(projects)
        .leftJoin(profiles, eq(profiles.id, projects.ownerId))
        .where(ownerFilter(projects.ownerId, visible))
        .orderBy(asc(projects.sr), asc(projects.pid));
      return {
        ok: true,
        data: rows.map(({ p, ownerName }) => ({
          pid: p.pid, sr: p.sr, name: p.name, type: p.type, plant: p.plant, sys: p.sys, mod: p.mod,
          phase: p.phase, status: p.status, pct: p.pct, notes: p.notes, quarter: p.quarter,
          ownerId: p.ownerId, ownerName: ownerName ?? "", editable: canEditOwner(me, p.ownerId),
        })),
      };
    }
    if (table === "notes") {
      const rows = await db
        .select({ n: notes, ownerName })
        .from(notes)
        .leftJoin(profiles, eq(profiles.id, notes.ownerId))
        .where(ownerFilter(notes.ownerId, visible))
        .orderBy(asc(notes.createdAt), asc(notes.id));
      return {
        ok: true,
        data: rows.map(({ n, ownerName }) => ({
          id: n.id, cat: n.cat as Note["cat"], text: n.text, date: n.date, converted: n.converted, projPid: n.projPid,
          ownerId: n.ownerId, ownerName: ownerName ?? "", editable: canEditOwner(me, n.ownerId),
        })),
      };
    }
    if (table === "pins") {
      const rows = await db.select().from(pins).where(eq(pins.ownerId, me.id));
      return { ok: true, data: rows.map((p) => ({ pid: p.pid, priority: p.priority as Pin["priority"], note: p.note, remind: p.remind, addedAt: p.addedAt })) };
    }
    // remarks on projects I can see
    const rows = await db
      .select({ r: remarks, author: sql<string>`coalesce(${profiles.fullName}, ${profiles.email})` })
      .from(remarks)
      .innerJoin(projects, eq(projects.pid, remarks.pid))
      .leftJoin(profiles, eq(profiles.id, remarks.authorId))
      .where(ownerFilter(projects.ownerId, visible))
      .orderBy(asc(remarks.at));
    return {
      ok: true,
      data: rows.map(({ r, author }) => ({ id: r.id, pid: r.pid, text: r.text, at: new Date(r.at).toISOString(), author: author ?? undefined, authorId: r.authorId })),
    };
  } catch (e) {
    return fail(e);
  }
}

/** Keep the ID sequences ahead of any IDs inserted directly (Excel upload, sample data). */
async function syncSequences() {
  const { sql: pg } = getConn();
  await pg`select setval('project_pid_seq', m.mx, true) from (
    select coalesce(max(substring(pid from 4)::int), 0) as mx from public.projects where pid ~ '^CMC[0-9]+$') m
    where m.mx >= (select last_value from public.project_pid_seq)`;
  await pg`select setval('note_id_seq', m.mx, true) from (
    select coalesce(max(substring(id from 2)::int), 0) as mx from public.notes where id ~ '^N[0-9]+$') m
    where m.mx >= (select last_value from public.note_id_seq)`;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Next free ID inside a save, skipping any ID that is already taken or used elsewhere in the same batch. */
async function nextFreeId(tx: Tx, kind: "project" | "note", taken: Set<string>) {
  for (let i = 0; i < 10_000; i++) {
    const rows = (await tx.execute(
      kind === "project"
        ? sql`select 'CMC' || lpad(nextval('project_pid_seq')::text, 4, '0') as id`
        : sql`select 'N' || lpad(nextval('note_id_seq')::text, 3, '0') as id`
    )) as unknown as { id: string }[];
    const id = rows[0].id;
    if (taken.has(id)) continue;
    const [exists] =
      kind === "project"
        ? await tx.select({ x: projects.pid }).from(projects).where(eq(projects.pid, id))
        : await tx.select({ x: notes.id }).from(notes).where(eq(notes.id, id));
    if (!exists) {
      taken.add(id);
      return id;
    }
  }
  throw new Error("Could not find a free ID");
}

/** A new, never-used ID (CMC0025 / N007), unique across ALL users. */
export async function reserveId(kind: "project" | "note"): Promise<Result<string>> {
  try {
    await requireMe();
    await syncSequences();
    const { sql: pg } = getConn();
    const [r] =
      kind === "project"
        ? await pg`select 'CMC' || lpad(nextval('project_pid_seq')::text, 4, '0') as id`
        : await pg`select 'N' || lpad(nextval('note_id_seq')::text, 3, '0') as id`;
    return { ok: true, data: r.id as string };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Save changes to one list in a single transaction: delete `removed` keys, insert-or-update `upserts`.
 * Returns reload: true when the server had to change something (e.g. give a clashing ID a new number).
 */
export async function applyChanges(table: TableName, removed: string[], upserts: Item[]): Promise<Result<{ reload: boolean }>> {
  try {
    const me = await requireMe();
    if (!Array.isArray(removed) || !Array.isArray(upserts) || removed.length + upserts.length > 2000) throw new AccessError("Too many changes at once");
    const visible = await visibleOwnerIds(me);
    const keys = removed.map((k) => str(k, 60)).filter(Boolean);
    let reload = false;
    if (table === "projects" || table === "notes") await syncSequences();

    await getDb().transaction(async (tx) => {
      if (table === "projects") {
        const batch = new Set((upserts as Project[]).map((p) => str(p.pid, 40)));
        for (const pid of keys) {
          const [row] = await tx.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.pid, pid));
          if (!row) continue;
          if (!canEditOwner(me, row.ownerId)) {
            if (canSeeOwner(visible, row.ownerId)) throw new AccessError(`${pid} is view only for you`);
            continue;
          }
          await tx.delete(projects).where(eq(projects.pid, pid));
        }
        for (const item of upserts as Project[]) {
          const values = cleanProject(item as unknown as Record<string, unknown>);
          const pid = str(item.pid, 40);
          const [row] = pid ? await tx.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.pid, pid)) : [];
          if (row && canEditOwner(me, row.ownerId)) {
            await tx.update(projects).set(values).where(eq(projects.pid, pid));
          } else if (row && canSeeOwner(visible, row.ownerId)) {
            throw new AccessError(`${pid} is view only for you`);
          } else {
            // New project. Admins restoring someone's project (Undo) keep the original owner.
            let ownerId = me.id;
            if (me.role === "admin" && item.ownerId && item.ownerId !== me.id) {
              const [o] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, item.ownerId));
              if (o) ownerId = o.id;
            }
            let newPid = pid;
            if (row || !pid) {
              newPid = await nextFreeId(tx, "project", batch); // ID belongs to someone you can't see → new number
              reload = true;
            }
            await tx.insert(projects).values({ ...values, ownerId, pid: newPid });
          }
        }
      }

      if (table === "notes") {
        const batch = new Set((upserts as Note[]).map((n) => str(n.id, 40)));
        for (const id of keys) {
          const [row] = await tx.select({ ownerId: notes.ownerId }).from(notes).where(eq(notes.id, id));
          if (!row) continue;
          if (!canEditOwner(me, row.ownerId)) {
            if (canSeeOwner(visible, row.ownerId)) throw new AccessError("That note is view only for you");
            continue;
          }
          await tx.delete(notes).where(eq(notes.id, id));
        }
        for (const item of upserts as Note[]) {
          const values = cleanNote(item as unknown as Record<string, unknown>);
          if (!values.text) continue;
          // A note may only link to a project you can see.
          let projPid: string | null = item.projPid ? str(item.projPid, 40) : null;
          if (projPid) {
            const [p] = await tx.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.pid, projPid));
            if (!p || !canSeeOwner(visible, p.ownerId)) projPid = null;
          }
          const id = str(item.id, 40);
          const [row] = id ? await tx.select({ ownerId: notes.ownerId }).from(notes).where(eq(notes.id, id)) : [];
          if (row && canEditOwner(me, row.ownerId)) {
            await tx.update(notes).set({ ...values, projPid }).where(eq(notes.id, id));
          } else if (row && canSeeOwner(visible, row.ownerId)) {
            throw new AccessError("That note is view only for you");
          } else {
            let newId = id;
            if (row || !id) {
              newId = await nextFreeId(tx, "note", batch);
              reload = true;
            }
            await tx.insert(notes).values({ ...values, projPid, ownerId: me.id, id: newId });
          }
        }
      }

      if (table === "pins") {
        if (keys.length) await tx.delete(pins).where(and(eq(pins.ownerId, me.id), inArray(pins.pid, keys)));
        for (const item of upserts as Pin[]) {
          const pid = str(item.pid, 40);
          const [p] = await tx.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.pid, pid));
          if (!p || !canSeeOwner(visible, p.ownerId)) {
            reload = true; // can only pin projects you can see
            continue;
          }
          const values = cleanPin(item as unknown as Record<string, unknown>);
          await tx
            .insert(pins)
            .values({ ...values, pid, ownerId: me.id })
            .onConflictDoUpdate({ target: [pins.ownerId, pins.pid], set: { priority: values.priority, note: values.note, remind: values.remind } });
        }
      }

      if (table === "remarks") {
        for (const id of keys) {
          if (!isUuid(id)) continue;
          const [row] = await tx.select({ authorId: remarks.authorId }).from(remarks).where(eq(remarks.id, id));
          if (!row) continue;
          if (!canDeleteRemark(me, row.authorId)) throw new AccessError("Only the author or an admin can delete that remark");
          await tx.delete(remarks).where(eq(remarks.id, id));
        }
        for (const item of upserts as Remark[]) {
          const text = str(item.text, 2000).trim();
          const pid = str(item.pid, 40);
          if (!text || !isUuid(item.id)) continue;
          const [p] = await tx.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.pid, pid));
          if (!p || !canSeeOwner(visible, p.ownerId)) throw new AccessError("You can only add remarks to projects you can see");
          // Remarks are add-only. Admins restoring a deleted remark (Undo) keep the original author.
          const authorId = me.role === "admin" && isUuid(item.authorId) ? (item.authorId as string) : me.id;
          const at = new Date(String(item.at));
          await tx
            .insert(remarks)
            .values({ id: item.id, pid, text, authorId, at: isNaN(at.getTime()) ? new Date() : at })
            .onConflictDoNothing({ target: remarks.id });
        }
      }
    });
    return { ok: true, data: { reload } };
  } catch (e) {
    return fail(e);
  }
}
