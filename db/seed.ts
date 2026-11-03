import "dotenv/config";

import { eq } from "drizzle-orm";

import { SEED_NOTES, SEED_PROJECTS } from "../lib/seed";
import { getConn } from "./index";
import { notes, profiles, projects } from "./schema";

async function main() {
  const { db, sql } = getConn();
  const [admin] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.role, "admin"))
    .limit(1);

  if (!admin) {
    console.log("No admin profile found. Sign up once, then run the seed again.");
    return;
  }

  const [existingProject] = await db
    .select({ pid: projects.pid })
    .from(projects)
    .limit(1);

  if (existingProject) {
    console.log("Projects already exist. Skipping seed.");
    return;
  }

  await db.insert(projects).values(
    SEED_PROJECTS.map((project) => ({
      ...project,
      ownerId: admin.id,
    })),
  );

  await db.insert(notes).values(
    SEED_NOTES.map((note) => ({
      ...note,
      ownerId: admin.id,
    })),
  );

  await sql`select setval(
    'project_pid_seq',
    (select coalesce(max(substring(pid from 4)::int), 0) from public.projects),
    true
  )`;

  await sql`select setval(
    'note_id_seq',
    (select coalesce(max(substring(id from 2)::int), 0) from public.notes),
    true
  )`;

  console.log(
    `Seeded ${SEED_PROJECTS.length} projects and ${SEED_NOTES.length} notes for ${admin.email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getConn().sql.end();
  });
