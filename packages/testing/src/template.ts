import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { type Client, Pool } from "pg";
import {
  createDatabase,
  dropDatabase,
  TEMPLATE_DATABASE,
  urlForDatabase,
} from "./test-database";

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../drizzle/migrations", import.meta.url),
);
const TEMPLATE_LOCK = 20261005;

async function migrationsFingerprint(): Promise<string> {
  const entries = await readdir(MIGRATIONS_FOLDER, { recursive: true });
  const hash = createHash("sha256");

  for (const entry of entries.sort()) {
    if (path.extname(entry) === "") continue;

    hash.update(entry);
    hash.update(await readFile(path.join(MIGRATIONS_FOLDER, entry)));
  }

  return hash.digest("hex");
}

async function storedFingerprint(admin: Client): Promise<string | null> {
  const { rows } = await admin.query<{ fingerprint: string | null }>(
    "SELECT shobj_description(oid, 'pg_database') AS fingerprint FROM pg_database WHERE datname = $1",
    [TEMPLATE_DATABASE],
  );

  return rows[0]?.fingerprint ?? null;
}

async function buildTemplate(
  admin: Client,
  fingerprint: string,
): Promise<void> {
  await dropDatabase(admin, TEMPLATE_DATABASE);
  await createDatabase(admin, TEMPLATE_DATABASE);

  const pool = new Pool({
    connectionString: urlForDatabase(TEMPLATE_DATABASE),
    max: 1,
  });

  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }

  await admin.query(
    `COMMENT ON DATABASE "${TEMPLATE_DATABASE}" IS '${fingerprint}'`,
  );
}

export async function ensureTemplate(admin: Client): Promise<void> {
  const fingerprint = await migrationsFingerprint();
  if ((await storedFingerprint(admin)) === fingerprint) return;

  await buildTemplate(admin, fingerprint);
}

export async function withTemplateLock<T>(
  admin: Client,
  work: () => Promise<T>,
): Promise<T> {
  await admin.query("SELECT pg_advisory_lock($1)", [TEMPLATE_LOCK]);

  try {
    return await work();
  } finally {
    await admin.query("SELECT pg_advisory_unlock($1)", [TEMPLATE_LOCK]);
  }
}
