import "dotenv/config";

import { readdir } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "false" ? false : "require",
});

const sqlDir = path.join(process.cwd(), "db", "sql");

async function main() {
  try {
    const files = (await readdir(sqlDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      process.stdout.write(`Applying ${file}... `);
      await sql.file(path.join(sqlDir, file), { cache: false });
      console.log("ok");
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
