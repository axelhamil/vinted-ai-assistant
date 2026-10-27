import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "bun";
import { poolConfigOf } from "./migrate";
import { MIGRATIONS_FOLDER } from "./migrations-folder";

const SCRIPT = join(import.meta.dir, "migrate.ts");

describe("the production migration script", () => {
  it("applies the migrations shipped next to the package, whatever the working directory", () => {
    expect(MIGRATIONS_FOLDER).toBe(join(import.meta.dir, "..", "migrations"));
    expect(existsSync(join(MIGRATIONS_FOLDER, "meta", "_journal.json"))).toBe(
      true,
    );
  });

  it("connects with DATABASE_URL alone on a single connection", () => {
    const config = poolConfigOf({
      DATABASE_URL: "postgres://app@db:5432/railway",
      PGHOST: "elsewhere",
    });

    expect(config.isSuccess && config.getValue()).toEqual({
      connectionString: "postgres://app@db:5432/railway",
      max: 1,
    });
  });

  it.each([[{}], [{ DATABASE_URL: "" }], [{ DATABASE_URL: "  " }]])(
    "refuses to connect without DATABASE_URL (%j)",
    (env) => {
      const config = poolConfigOf(env);

      expect(config.isFailure && config.getError()).toBe(
        "DATABASE_URL is not set",
      );
    },
  );

  it("exits 1 with the reason when run without DATABASE_URL, touching no database", () => {
    const { DATABASE_URL: _, ...env } = process.env;

    const run = spawnSync(["bun", SCRIPT], {
      cwd: tmpdir(),
      env,
    });

    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("DATABASE_URL is not set");
  });
});
