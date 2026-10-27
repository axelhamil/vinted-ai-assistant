import { fileURLToPath } from "node:url";
import { Result } from "@packages/ddd-kit";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool, type PoolConfig } from "pg";

export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

export function poolConfigOf(
  env: Record<string, string | undefined>,
): Result<PoolConfig> {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) return Result.fail("DATABASE_URL is not set");

  return Result.ok({ connectionString, max: 1 });
}

function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  return [error.message, error.cause].filter(Boolean).join(": ");
}

async function main(): Promise<number> {
  const config = poolConfigOf(process.env);
  if (config.isFailure) {
    process.stderr.write(`migrate: ${config.getError()}\n`);
    return 1;
  }

  const pool = new Pool(config.getValue());
  try {
    const database = drizzle(pool);
    const count = async () => {
      const { rows } = await pool.query<{ count: number }>(
        "select count(*)::int as count from drizzle.__drizzle_migrations",
      );
      return rows[0]?.count ?? 0;
    };
    const exists = await pool.query<{ present: boolean }>(
      "select to_regclass('drizzle.__drizzle_migrations') is not null as present",
    );
    const before = exists.rows[0]?.present ? await count() : 0;

    await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });

    const after = await count();
    console.log(`migrate: ${after - before} applied, ${after} recorded`);
    return 0;
  } catch (error) {
    process.stderr.write(
      `migrate: failed, the run rolled back: ${reasonOf(error)}\n`,
    );
    return 1;
  } finally {
    await pool.end();
  }
}

if (import.meta.main) process.exit(await main());
