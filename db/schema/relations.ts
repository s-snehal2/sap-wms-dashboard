import { defineRelations } from "drizzle-orm";

import * as schema from "./index";

export const relations = defineRelations(schema, (r) => ({
  profiles: {
    hod: r.one.profiles({
      from: r.profiles.hodId,
      to: r.profiles.id,
      alias: "hod",
      optional: true,
    }),
    team: r.many.profiles({
      from: r.profiles.id,
      to: r.profiles.hodId,
      alias: "team",
    }),
    projects: r.many.projects({
      from: r.profiles.id,
      to: r.projects.ownerId,
    }),
    notes: r.many.notes({
      from: r.profiles.id,
      to: r.notes.ownerId,
    }),
    pins: r.many.pins({
      from: r.profiles.id,
      to: r.pins.ownerId,
    }),
    remarks: r.many.remarks({
      from: r.profiles.id,
      to: r.remarks.authorId,
    }),
  },
  projects: {
    owner: r.one.profiles({
      from: r.projects.ownerId,
      to: r.profiles.id,
      optional: false,
    }),
    // Named linkedNotes because projects already has a "notes" text column.
    linkedNotes: r.many.notes({
      from: r.projects.pid,
      to: r.notes.projPid,
    }),
    pins: r.many.pins({
      from: r.projects.pid,
      to: r.pins.pid,
    }),
    remarks: r.many.remarks({
      from: r.projects.pid,
      to: r.remarks.pid,
    }),
  },
  notes: {
    owner: r.one.profiles({
      from: r.notes.ownerId,
      to: r.profiles.id,
      optional: false,
    }),
    project: r.one.projects({
      from: r.notes.projPid,
      to: r.projects.pid,
      optional: true,
    }),
  },
  pins: {
    owner: r.one.profiles({
      from: r.pins.ownerId,
      to: r.profiles.id,
      optional: false,
    }),
    project: r.one.projects({
      from: r.pins.pid,
      to: r.projects.pid,
      optional: false,
    }),
  },
  remarks: {
    author: r.one.profiles({
      from: r.remarks.authorId,
      to: r.profiles.id,
      optional: false,
    }),
    project: r.one.projects({
      from: r.remarks.pid,
      to: r.projects.pid,
      optional: false,
    }),
  },
}));
