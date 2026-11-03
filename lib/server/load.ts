import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { canEditOwner, visibleOwnerIds } from "@/lib/server/access";
import type { Me, Note, Pin, Project, Remark } from "@/lib/types";

export type AllData = { projects: Project[]; notes: Note[]; pins: Pin[]; remarks: Remark[] };

const { projects, notes, pins, remarks, profiles } = schema;

const ownerFilter = (col: Parameters<typeof inArray>[0], visible: string[] | "all"): SQL | undefined =>
  visible === "all" ? undefined : inArray(col, visible);

/**
 * Everything the dashboard needs for this person, in one go: the four queries run at the same time.
 * Used by the page itself (so the dashboard arrives already filled) and by the 20-second refresh.
 */
export async function loadAllFor(me: Me): Promise<AllData> {
  const visible = await visibleOwnerIds(me);
  const db = getDb();
  const nameOf = sql<string>`coalesce(${profiles.fullName}, ${profiles.email})`;

  const [projRows, noteRows, pinRows, remarkRows] = await Promise.all([
    db
      .select({ p: projects, ownerName: nameOf })
      .from(projects)
      .leftJoin(profiles, eq(profiles.id, projects.ownerId))
      .where(ownerFilter(projects.ownerId, visible))
      .orderBy(asc(projects.sr), asc(projects.pid)),
    db
      .select({ n: notes, ownerName: nameOf })
      .from(notes)
      .leftJoin(profiles, eq(profiles.id, notes.ownerId))
      .where(ownerFilter(notes.ownerId, visible))
      .orderBy(asc(notes.createdAt), asc(notes.id)),
    db.select().from(pins).where(eq(pins.ownerId, me.id)),
    db
      .select({ r: remarks, author: nameOf })
      .from(remarks)
      .innerJoin(projects, eq(projects.pid, remarks.pid))
      .leftJoin(profiles, eq(profiles.id, remarks.authorId))
      .where(and(ownerFilter(projects.ownerId, visible)))
      .orderBy(asc(remarks.at)),
  ]);

  return {
    projects: projRows.map(({ p, ownerName }) => ({
      pid: p.pid, sr: p.sr, name: p.name, type: p.type, plant: p.plant, sys: p.sys, mod: p.mod,
      phase: p.phase, status: p.status, pct: p.pct, notes: p.notes, quarter: p.quarter,
      ownerId: p.ownerId, ownerName: ownerName ?? "", editable: canEditOwner(me, p.ownerId),
    })),
    notes: noteRows.map(({ n, ownerName }) => ({
      id: n.id, cat: n.cat as Note["cat"], text: n.text, date: n.date, converted: n.converted, projPid: n.projPid,
      ownerId: n.ownerId, ownerName: ownerName ?? "", editable: canEditOwner(me, n.ownerId),
    })),
    pins: pinRows.map((p) => ({ pid: p.pid, priority: p.priority as Pin["priority"], note: p.note, remind: p.remind, addedAt: p.addedAt })),
    remarks: remarkRows.map(({ r, author }) => ({
      id: r.id, pid: r.pid, text: r.text, at: new Date(r.at).toISOString(), author: author ?? undefined, authorId: r.authorId,
    })),
  };
}
