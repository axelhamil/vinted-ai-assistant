import { Database } from "bun:sqlite";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Result } from "@packages/ddd-kit";

const WAL_SIDE_FILES = ["-wal", "-shm"];

function copyWithSideFiles(path: string, copy: string): void {
  copyFileSync(path, copy);

  for (const suffix of WAL_SIDE_FILES) {
    if (existsSync(`${path}${suffix}`))
      copyFileSync(`${path}${suffix}`, `${copy}${suffix}`);
  }
}

export async function readLegacyCopy<T>(
  path: string,
  read: (source: Database) => Promise<T>,
): Promise<Result<T>> {
  const folder = mkdtempSync(join(tmpdir(), "legacy-sqlite-"));
  const copy = join(folder, basename(path));

  try {
    copyWithSideFiles(path, copy);
    const source = new Database(copy, { create: false });
    const value = await read(source).finally(() => source.close());

    return Result.ok(value);
  } catch (error) {
    return Result.fail(`cannot read ${path}: ${error}`);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
